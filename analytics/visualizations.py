"""
Visualizations Module (Matplotlib)
Generates publication-quality charts using the professional blue-and-white design palette.
Color specifications:
  - Deep Navy Blue: #123B73
  - Secondary Blue: #2563EB
  - Accent Blue: #60A5FA
  - Border: #DCE6F2
  - Background: #F5F8FF
"""

import io
import base64
from typing import List, Dict, Any

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False


def generate_course_comparison_chart(courses_summary: List[Dict[str, Any]]) -> str:
    """
    Generates a grouped bar chart comparing Eligible vs Completed Enrolments per course.
    Returns base64 encoded PNG string.
    """
    if not MATPLOTLIB_AVAILABLE or not courses_summary:
        return ""

    course_names = [c["course_name"][:18] + ".." if len(c["course_name"]) > 18 else c["course_name"] for c in courses_summary]
    eligible = [c["eligible_enrolments"] for c in courses_summary]
    completed = [c["completed_enrolments"] for c in courses_summary]

    x = range(len(course_names))
    width = 0.35

    fig, ax = plt.subplots(figsize=(10, 5), facecolor='#F5F8FF')
    ax.set_facecolor('#FFFFFF')

    rects1 = ax.bar([i - width/2 for i in x], eligible, width, label='Eligible Enrolments', color='#2563EB')
    rects2 = ax.bar([i + width/2 for i in x], completed, width, label='Completed Enrolments', color='#123B73')

    ax.set_ylabel('Number of Enrolments', color='#172B4D', fontsize=11, fontweight='bold')
    ax.set_title('Course Comparison: Enrolments vs Completions', color='#123B73', fontsize=14, fontweight='bold', pad=15)
    ax.set_xticks(list(x))
    ax.set_xticklabels(course_names, rotation=20, ha='right', color='#172B4D')
    ax.legend(frameon=True, facecolor='#FFFFFF', edgecolor='#DCE6F2')
    ax.grid(axis='y', linestyle='--', alpha=0.5, color='#DCE6F2')

    plt.tight_layout()
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=150, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close(fig)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def generate_activity_trend_chart(weekly_data: List[Dict[str, Any]]) -> str:
    """
    Generates a trend line chart of weekly learning activities.
    Returns base64 encoded PNG string.
    """
    if not MATPLOTLIB_AVAILABLE or not weekly_data:
        return ""

    weeks = [w["week_label"] for w in weekly_data]
    total_events = [w["total_events"] for w in weekly_data]
    completed_events = [w["completed_events"] for w in weekly_data]

    fig, ax = plt.subplots(figsize=(10, 4.5), facecolor='#F5F8FF')
    ax.set_facecolor('#FFFFFF')

    ax.plot(weeks, total_events, marker='o', linewidth=2.5, color='#2563EB', label='Total Events')
    ax.plot(weeks, completed_events, marker='s', linewidth=2, color='#15803D', linestyle='--', label='Completed Events')

    ax.set_ylabel('Activity Event Count', color='#172B4D', fontsize=11, fontweight='bold')
    ax.set_title('Weekly Learning Activity Trend', color='#123B73', fontsize=14, fontweight='bold', pad=15)
    ax.legend(frameon=True, facecolor='#FFFFFF', edgecolor='#DCE6F2')
    ax.grid(True, linestyle='--', alpha=0.5, color='#DCE6F2')

    plt.tight_layout()
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=150, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close(fig)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')
