from langchain.tools import tool

from app.services.apollo_service import ApolloService


@tool("phone_finder")
async def phone_finder_tool(name: str, company: str, linkedin_url: str | None = None) -> dict:
    """Find direct dial and contact details for a person using Apollo."""
    return await ApolloService().find_contact(name=name, company=company, linkedin_url=linkedin_url)
