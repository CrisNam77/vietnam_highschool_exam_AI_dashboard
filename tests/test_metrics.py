import src.metrics as metrics


def test_metrics_module_imports():
    expected_functions = [
        "get_overview_kpis",
        "get_subject_summary",
        "get_yearly_trend",
        "get_region_summary",
        "get_score_distribution",
        "get_correlation_matrix",
        "get_combination_summary",
    ]

    for function_name in expected_functions:
        assert hasattr(metrics, function_name)
