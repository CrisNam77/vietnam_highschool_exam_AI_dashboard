import src.metrics as metrics


def test_metrics_module_imports():
    expected_functions = [
        "markdown_table",
        "check_course_requirements",
        "build_validation_summary",
        "build_clean_run_report",
        "build_data_quality_report",
    ]

    for function_name in expected_functions:
        assert hasattr(metrics, function_name)
