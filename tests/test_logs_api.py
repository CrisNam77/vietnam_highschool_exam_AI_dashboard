from backend.app.api.routes.logs import list_logs


def test_logs_returns_list():
    response = list_logs()

    assert isinstance(response, list)
