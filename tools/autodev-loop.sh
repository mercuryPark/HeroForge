#!/bin/bash
# autodev-loop.sh — Checks COVERAGE.md for remaining work in the current active phase.
# Exit 0 = more work remains, Exit 1 = done or inactive
export LC_ALL=C

# Anchor to project root regardless of where this script is invoked from
cd "$(dirname "$0")/.." || exit 1

COVERAGE="docs/COVERAGE.md"
STATE_FILE=".omc/autodev-active"

if [ ! -f "$STATE_FILE" ]; then
  echo "AUTODEV_INACTIVE"
  exit 1
fi

if [ ! -f "$COVERAGE" ]; then
  echo "ERROR: $COVERAGE not found"
  exit 1
fi

# Find the highest-numbered partial phase (skip Phase 0/1 which have only residual items)
PHASE_NUM=$(grep 'Partial' "$COVERAGE" | grep -oE '\| [0-9]+ \|' | tr -d '| ' | awk '$1 >= 2' | sort -n | tail -1)

if [ -z "$PHASE_NUM" ]; then
  # No partial Phase 2+ — find the first Not Started phase
  PHASE_NUM=$(grep 'Not Started' "$COVERAGE" | grep -oE '\| [0-9]+ \|' | tr -d '| ' | sort -n | head -1)
fi

if [ -z "$PHASE_NUM" ]; then
  # Fall back to any partial (including Phase 0/1 residuals)
  PHASE_NUM=$(grep 'Partial' "$COVERAGE" | grep -oE '\| [0-9]+ \|' | tr -d '| ' | sort -n | tail -1)
fi

if [ -z "$PHASE_NUM" ]; then
  echo "ALL_COMPLETE"
  rm -f "$STATE_FILE"
  exit 1
fi

# Extract the phase section (terminated by next ### Phase header)
NEXT_PHASE_NUM=$((PHASE_NUM + 1))
PHASE_SECTION=$(awk "/^### Phase ${PHASE_NUM}:/,/^### Phase ${NEXT_PHASE_NUM}:/" "$COVERAGE")

# Find first unchecked item
UNCHECKED=$(echo "$PHASE_SECTION" | grep '^- \[ \]' | head -1)

if [ -z "$UNCHECKED" ]; then
  echo "PHASE_${PHASE_NUM}_COMPLETE_MOVE_NEXT"
  exit 0
fi

# Find sub-phase: get line number of unchecked item, then find nearest #### above it
UNCHECKED_LINE=$(echo "$PHASE_SECTION" | grep -n '^- \[ \]' | head -1 | cut -d: -f1)
SUBPHASE=$(echo "$PHASE_SECTION" | head -n "$UNCHECKED_LINE" | grep '^####' | tail -1 | sed 's/^#### //')
[ -z "$SUBPHASE" ] && SUBPHASE="(sub-phase 미확인)"

echo "NEXT_PHASE: Phase ${PHASE_NUM}"
echo "NEXT_SUBPHASE: ${SUBPHASE}"
echo "NEXT_TASK:${UNCHECKED}"
echo "---"
echo "Phase ${PHASE_NUM}의 다음 미완료 sub-phase(${SUBPHASE})를 구현하세요."
exit 0
