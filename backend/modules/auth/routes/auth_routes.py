from fastapi import APIRouter, Depends, Request, Response, status

from core.security import get_current_user
from core.types import CurrentUser
from modules.auth.helpers.auth_cookies import delete_refresh_cookie, read_refresh_cookie, set_refresh_cookie
from modules.auth.services.auth_services import AuthService, get_auth_service
from modules.auth.services.invitation_services import InvitationService, get_invitation_service
from modules.auth.types.auth_types import AccessTokenOut, CredentialChangeIn, InvitationAcceptIn, InvitationOut, LoginIn, LoginOptionsIn, LoginOptionsOut, LoginOut, SessionIn


router = APIRouter(tags=["auth"])


@router.post("/login-options", response_model=LoginOptionsOut)
def get_login_options(payload: LoginOptionsIn, auth_service: AuthService = Depends(get_auth_service)) -> LoginOptionsOut:
    """
    List the Login Methods offered for the identifier typed on the first login step.

    Args:
        payload (LoginOptionsIn): Phone or email as typed.
        auth_service (AuthService): Injected auth service.

    Returns:
        LoginOptionsOut: Normalized identifier and its Login Methods.
    """
    return auth_service.get_login_options(payload.identifier)


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, response: Response, auth_service: AuthService = Depends(get_auth_service)) -> LoginOut:
    """
    Log a User in with a PIN or a password and set their refresh cookie on this device.

    Args:
        payload (LoginIn): Identifier, Login Method and secret.
        response (Response): Response receiving the refresh cookie.
        auth_service (AuthService): Injected auth service.

    Returns:
        LoginOut: Access token and what the front must do next.
    """
    issued = auth_service.login(payload)
    set_refresh_cookie(response, issued.tokens.user_id, issued.tokens.refresh_token)
    return issued.result


@router.post("/refresh", response_model=AccessTokenOut)
def refresh(payload: SessionIn, request: Request, response: Response, auth_service: AuthService = Depends(get_auth_service)) -> AccessTokenOut:
    """
    Exchange a User's refresh cookie for a new access token with their current Permissions, rotating the cookie.

    Args:
        payload (SessionIn): User to refresh, since a shared phone keeps one cookie per Operator.
        request (Request): Request carrying the cookies.
        response (Response): Response receiving the rotated cookie.
        auth_service (AuthService): Injected auth service.

    Returns:
        AccessTokenOut: New access token.
    """
    tokens = auth_service.refresh(payload.user_id, read_refresh_cookie(request, payload.user_id))
    set_refresh_cookie(response, tokens.user_id, tokens.refresh_token)
    return AccessTokenOut(access_token=tokens.access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: SessionIn, response: Response) -> None:
    """
    Log a User out of this device by deleting their refresh cookie; the short-lived access token expires on its own.

    Args:
        payload (SessionIn): User logging out.
        response (Response): Response clearing the cookie.
    """
    delete_refresh_cookie(response, payload.user_id)


@router.put("/credential", status_code=status.HTTP_204_NO_CONTENT)
def change_credential(
    payload: CredentialChangeIn,
    response: Response,
    current_user: CurrentUser = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> None:
    """
    Set the signed-in User's new PIN or password; other devices are logged out and this one gets a fresh refresh cookie.

    Args:
        payload (CredentialChangeIn): PIN or password, and the new secret.
        response (Response): Response receiving the new refresh cookie.
        current_user (CurrentUser): User from the access token.
        auth_service (AuthService): Injected auth service.
    """
    tokens = auth_service.change_credential(current_user.id, payload.kind, payload.secret, payload.current_secret)
    set_refresh_cookie(response, tokens.user_id, tokens.refresh_token)


@router.post("/credential/skip", status_code=status.HTTP_204_NO_CONTENT)
def skip_credential_change(current_user: CurrentUser = Depends(get_current_user), auth_service: AuthService = Depends(get_auth_service)) -> None:
    """
    Let a Client keep the first secret Management set.

    Args:
        current_user (CurrentUser): User from the access token.
        auth_service (AuthService): Injected auth service.
    """
    auth_service.skip_credential_change(current_user.id)


@router.get("/invitations/{token}", response_model=InvitationOut)
def get_invitation(token: str, invitation_service: InvitationService = Depends(get_invitation_service)) -> InvitationOut:
    """
    Read the Invitation behind a link, for the page where the invited User chooses their secret.

    Args:
        token (str): Plain token from the link.
        invitation_service (InvitationService): Injected invitation service.

    Returns:
        InvitationOut: Who is invited, by whom, and which secret to choose.
    """
    return invitation_service.get_invitation(token)


@router.post("/invitations/{token}/accept", response_model=LoginOut)
def accept_invitation(token: str, payload: InvitationAcceptIn, response: Response, invitation_service: InvitationService = Depends(get_invitation_service)) -> LoginOut:
    """
    Accept an Invitation with the chosen secret, log the User in and set their refresh cookie.

    Args:
        token (str): Plain token from the link.
        payload (InvitationAcceptIn): Chosen PIN or password.
        response (Response): Response receiving the refresh cookie.
        invitation_service (InvitationService): Injected invitation service.

    Returns:
        LoginOut: Access token and what the front must do next.
    """
    issued = invitation_service.accept_invitation(token, payload.secret)
    set_refresh_cookie(response, issued.tokens.user_id, issued.tokens.refresh_token)
    return issued.result
