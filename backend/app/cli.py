"""Maintenance commands.

    python -m app.cli create-admin --email boss@megasmart.kz --name "Имя Фамилия"

The password is asked interactively, or read from stdin with --password-stdin
(for scripts: `echo "$PASS" | python -m app.cli create-admin ... --password-stdin`).
"""

import argparse
import asyncio
import getpass
import sys

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.db import SessionFactory, engine
from app.core.errors import AppError
from app.models import UserRole
from app.schemas.admin.auth import UserCreate, UserRead
from app.services.admin.audit import DbAuditWriter
from app.services.admin.users import UserService


async def create_admin(
    email: str,
    name: str,
    password: str,
    *,
    session_factory: async_sessionmaker[AsyncSession] = SessionFactory,
) -> UserRead:
    data = UserCreate(email=email, full_name=name, role=UserRole.admin, password=password)
    async with session_factory() as session:
        # user_id=None: the audit log shows the action as done by the system.
        service = UserService(session, DbAuditWriter(session, user_id=None), acting_user=None)
        return await service.create(data)


def read_password(from_stdin: bool) -> str:
    if from_stdin:
        return sys.stdin.readline().rstrip("\n")
    first = getpass.getpass("Пароль: ")
    if getpass.getpass("Повторите пароль: ") != first:
        sys.exit("Пароли не совпадают")
    return first


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)

    create = commands.add_parser("create-admin", help="Create an administrator account")
    create.add_argument("--email", required=True)
    create.add_argument("--name", required=True, help="Full name shown in the admin")
    create.add_argument(
        "--password-stdin", action="store_true", help="Read the password from stdin"
    )

    args = parser.parse_args(argv)
    if args.command == "create-admin":
        password = read_password(args.password_stdin)
        try:
            user = asyncio.run(_create_admin_once(args.email, args.name, password))
        except ValidationError as exc:
            sys.exit("; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors()))
        except AppError as exc:
            sys.exit(exc.message)
        print(f"Администратор создан: {user.email} ({user.id})")


async def _create_admin_once(email: str, name: str, password: str) -> UserRead:
    """Run in a fresh event loop and close the pool before it ends."""
    try:
        return await create_admin(email, name, password)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    main()
