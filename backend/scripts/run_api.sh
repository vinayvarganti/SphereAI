#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PYTHON_BIN="${BACKEND_DIR}/venv/bin/python"

if [ ! -x "${PYTHON_BIN}" ]; then
  echo "Virtualenv not found at ${PYTHON_BIN}"
  echo "Run: cd ${BACKEND_DIR} && python3.11 -m venv venv && ./venv/bin/python -m pip install -r requirements.txt"
  exit 1
fi

cd "${BACKEND_DIR}"
echo "Using Python: $(${PYTHON_BIN} -c 'import sys; print(sys.executable)')"
exec "${PYTHON_BIN}" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
