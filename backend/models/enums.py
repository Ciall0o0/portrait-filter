from enum import StrEnum


class QualityIssue(StrEnum):
    CLOSED_EYES = "closed_eyes"
    GLARE_REFLECTION = "glare_reflection"
    LOW_RESOLUTION = "low_resolution"
    MOTION_BLUR = "motion_blur"
    POOR_EXPOSURE = "poor_exposure"
    POOR_COMPOSITION = "poor_composition"
    BAD_COLOR_BALANCE = "bad_color_balance"
    NOISE = "noise"
