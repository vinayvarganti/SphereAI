from langchain.tools import tool

from app.services.serper_service import SerperService


@tool("web_search")
async def web_search_tool(query: str, search_type: str = "news") -> list[dict]:
    """Search Google web or news using Serper and return normalized result rows."""
    return await SerperService().search(query=query, search_type=search_type)
