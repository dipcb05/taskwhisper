from typing import Any
from fastapi import HTTPException, status


class ServiceError(Exception):
    def __init__(self, stage: str, message: str, code: str = "service_error", provider_response: Any | None = None):
        super().__init__(message)
        self.stage = stage
        self.code = code
        self.provider_response = provider_response
        self.message = message


def http_error_from_service(err: ServiceError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={"stage": err.stage, "error_code": err.code, "message": err.message, "provider_response": err.provider_response},
    )
