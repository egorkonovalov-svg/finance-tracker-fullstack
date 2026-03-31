class AppError(Exception):
    """Base class for all domain errors."""

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class AuthenticationError(AppError):
    """Raised when credentials are invalid or a token cannot be verified. → 401"""


class AuthorizationError(AppError):
    """Raised when the caller lacks permission for the requested resource. → 403"""


class NotFoundError(AppError):
    """Raised when a requested resource does not exist. → 404"""


class ConflictError(AppError):
    """Raised when an operation would violate a uniqueness constraint. → 409"""


class RateLimitError(AppError):
    """Raised when a caller has exceeded an allowed request rate. → 429"""


class EmailDeliveryError(AppError):
    """Raised when a verification email could not be sent. Callers decide how to handle it."""
