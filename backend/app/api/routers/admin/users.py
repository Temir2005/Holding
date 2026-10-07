import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import AuditDep, CurrentUser, SessionDep
from app.schemas.admin.auth import SetPasswordRequest, UserCreate, UserRead, UserUpdate
from app.schemas.admin.common import ListParams, Paginated, error_responses
from app.services.admin.users import UserService

router = APIRouter(prefix="/users", tags=["admin: users"])


def service(session: SessionDep, audit: AuditDep, user: CurrentUser) -> UserService:
    return UserService(session, audit, acting_user=user)


Service = Annotated[UserService, Depends(service)]


@router.get("", response_model=Paginated[UserRead], summary="List admin users")
async def list_users(svc: Service, params: Annotated[ListParams, Depends()]) -> Paginated[UserRead]:
    return await svc.list(params)


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user",
    responses=error_responses(409, 422),
)
async def create_user(data: UserCreate, svc: Service) -> UserRead:
    return await svc.create(data)


@router.get(
    "/{user_id}", response_model=UserRead, summary="Get a user", responses=error_responses(404)
)
async def get_user(user_id: uuid.UUID, svc: Service) -> UserRead:
    return await svc.read(user_id)


@router.patch(
    "/{user_id}",
    response_model=UserRead,
    summary="Change name, role or deactivate (is_active=false)",
    responses=error_responses(404, 409, 422),
)
async def update_user(user_id: uuid.UUID, data: UserUpdate, svc: Service) -> UserRead:
    return await svc.update(user_id, data)


@router.post(
    "/{user_id}/password",
    response_model=UserRead,
    summary="Set a new password for a user; their sessions end",
    responses=error_responses(404, 422),
)
async def set_user_password(user_id: uuid.UUID, data: SetPasswordRequest, svc: Service) -> UserRead:
    return await svc.set_password(user_id, data.new_password)
