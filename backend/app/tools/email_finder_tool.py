from langchain.tools import tool

from app.services.hunter_service import HunterService


@tool("email_finder")
async def email_finder_tool(domain: str, first_name: str, last_name: str) -> dict:
    """Find a professional email address for a person at a company domain."""
    return await HunterService().find_email(domain=domain, first_name=first_name, last_name=last_name)
