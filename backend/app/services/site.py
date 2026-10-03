from app.core.i18n import Locale
from app.repositories.content import ContentRepository
from app.schemas.refs import collect_refs, expand
from app.schemas.site import SiteSettingsDoc, SiteSettingsRead
from app.services.mappers import Mapper
from app.services.pages import RefLoader


class SiteService:
    def __init__(self, repo: ContentRepository, mapper: Mapper) -> None:
        self.repo = repo
        self.mapper = mapper

    async def get(self, locale: Locale) -> SiteSettingsRead | None:
        row = await self.repo.site_settings()
        if row is None:
            return None
        doc = SiteSettingsDoc.model_validate(
            {
                "site_name": row.site_name,
                "logo_id": row.logo_id,
                "navigation": row.navigation,
                "contacts": row.contacts,
                "socials": row.socials,
                "footer": row.footer,
                "default_seo": row.default_seo,
            }
        )
        loaded = await RefLoader(self.repo, self.mapper).load(collect_refs(doc))
        return SiteSettingsRead.model_validate(expand(doc, locale, loaded))
