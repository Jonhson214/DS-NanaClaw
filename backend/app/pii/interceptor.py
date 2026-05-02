from __future__ import annotations

from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from presidio_analyzer.nlp_engine import NlpEngineProvider

from app.pii.vault import PIIVault


class PIIInterceptor:
    SUPPORTED_ENTITIES = [
        "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER",
        "LOCATION", "CREDIT_CARD", "IBAN_CODE",
        "US_SSN", "IP_ADDRESS",
    ]

    ENTITY_PREFIX_MAP = {
        "PERSON": "PERSON",
        "EMAIL_ADDRESS": "EMAIL",
        "PHONE_NUMBER": "PHONE",
        "LOCATION": "LOCATION",
        "CREDIT_CARD": "CARD",
        "US_SSN": "SSN",
        "IP_ADDRESS": "IP",
        "IBAN_CODE": "IBAN",
    }

    def __init__(self, vault: PIIVault):
        self.vault = vault
        nlp_config = {
            "nlp_engine_name": "spacy",
            "models": [
                {"lang_code": "en", "model_name": "en_core_web_trf"},
                {"lang_code": "zh", "model_name": "zh_core_web_trf"},
            ],
        }
        provider = NlpEngineProvider(nlp_configuration=nlp_config)
        nlp_engine = provider.create_engine()
        registry = RecognizerRegistry()
        registry.load_predefined_recognizers(nlp_engine=nlp_engine)
        self.analyzer = AnalyzerEngine(
            nlp_engine=nlp_engine,
            registry=registry,
        )

    def anonymize_payload(
        self,
        payload: dict,
        order_id: str,
        fields_to_scan: list[str] | None = None,
    ) -> tuple[dict, dict]:
        if fields_to_scan is None:
            fields_to_scan = [
                "customer_name", "customer_email", "customer_phone",
                "shipping_address", "review_text",
            ]

        pii_mapping: dict[str, str] = {}
        entity_counters: dict[str, int] = {}
        anonymized = dict(payload)

        for field in fields_to_scan:
            if field not in payload or not payload[field]:
                continue

            text = str(payload[field])
            results = self.analyzer.analyze(
                text=text,
                entities=self.SUPPORTED_ENTITIES,
                language="en",
            )
            results = sorted(results, key=lambda r: r.start)

            offset = 0
            anonymized_text = text
            for result in results:
                entity_type = result.entity_type
                prefix = self.ENTITY_PREFIX_MAP.get(entity_type, entity_type)
                entity_counters.setdefault(prefix, 0)
                entity_counters[prefix] += 1
                placeholder = f"[{prefix}_{entity_counters[prefix]}]"
                original_value = text[result.start:result.end]

                if original_value not in pii_mapping.values():
                    pii_mapping[placeholder] = original_value

                start = result.start + offset
                end = result.end + offset
                anonymized_text = (
                    anonymized_text[:start] + placeholder + anonymized_text[end:]
                )
                offset += len(placeholder) - (result.end - result.start)

            anonymized[field] = anonymized_text

        self.vault.store(order_id, pii_mapping)
        return anonymized, pii_mapping
