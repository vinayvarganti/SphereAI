from app.services.serper_service import SerperService


# News/aggregator domains that shouldn't be searched for people
_NEWS_DOMAINS = frozenset({
    "techcrunch.com", "reuters.com", "bloomberg.com", "forbes.com",
    "businessinsider.com", "cnbc.com", "wsj.com", "nytimes.com",
    "theverge.com", "venturebeat.com", "crunchbase.com", "news.crunchbase.com",
    "thesaasnews.com", "saasrise.com", "techinasia.com", "inc42.com",
    "thenextweb.com", "tech.eu", "osborneclarke.com", "ycombinator.com",
    "highalpha.com", "team4.agency", "b2b.economictimes.indiatimes.com",
    "reddit.com", "x.com", "twitter.com", "youtube.com",
})


class LinkedInTool:
    async def search_people(self, company: str, title_patterns: list[str]) -> list[dict]:
        # Skip searching if company name looks like a news article or aggregator
        company_lower = company.lower()
        if any(noise in company_lower for noise in [
            "saas news", "crunchbase", "techcrunch", "funding wrap",
            "series a", "series b", "series c", "startup funded",
            "r/b2b", "vc deals", "investment", "how to find"
        ]):
            return []

        title_query = " OR ".join(f'"{title}"' for title in title_patterns[:3])
        query = f'site:linkedin.com/in "{company}" ({title_query})'
        rows = await SerperService().search(query=query, search_type="search")
        people: list[dict] = []
        for row in rows:
            link = row.get("link", "")
            if "linkedin.com/in/" not in link:
                continue
            # LinkedIn result title format: "Name - Title at Company | LinkedIn"
            raw_title = row.get("title", "")
            name, job_title = self._parse_linkedin_title(raw_title, company)
            if not name:
                continue
            people.append(
                {
                    "name": name,
                    "title": job_title or row.get("snippet", "")[:160],
                    "linkedin_url": link,
                    "source": row.get("source", "linkedin_search"),
                }
            )
        return people

    def _parse_linkedin_title(self, raw: str, company: str) -> tuple[str, str]:
        """Parse 'Name - Title at Company | LinkedIn' into (name, title)."""
        # Remove ' | LinkedIn' suffix
        clean = raw.replace("| LinkedIn", "").replace("- LinkedIn", "").strip()
        # Split on ' - ' to get name vs title
        parts = clean.split(" - ", 1)
        name = parts[0].strip()
        job_title = parts[1].strip() if len(parts) > 1 else ""
        # Remove "at Company" suffix from job title
        if " at " in job_title.lower():
            job_title = job_title[: job_title.lower().index(" at ")].strip()
        return name, job_title
