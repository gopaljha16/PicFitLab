import { describe, expect, it } from 'vitest';
import { computeDrawPlan, physicalToPixels, resolveTargetDimensions } from '@/engines/geometry';

describe('geometry engine', () => {
  it('locks aspect ratio when only one dimension is specified', () => {
    expect(resolveTargetDimensions(1920, 1080, 960, undefined, true)).toEqual({
      width: 960,
      height: 540,
    });
    expect(resolveTargetDimensions(1920, 1080, undefined, 540, true)).toEqual({
      width: 960,
      height: 540,
    });
  });

  it('computes cover crop centered for landscape to square 600x600', () => {
    const plan = computeDrawPlan(1200, 800, 600, 600, 'cover');
    expect(plan.sx).toBe(200);
    expect(plan.sy).toBe(0);
    expect(plan.sw).toBe(800);
    expect(plan.sh).toBe(800);
    expect(plan.canvasWidth).toBe(600);
    expect(plan.canvasHeight).toBe(600);
  });

  it('computes contain padding for landscape inside square 600x600', () => {
    const plan = computeDrawPlan(1200, 600, 600, 600, 'contain');
    expect(plan.dx).toBe(0);
    expect(plan.dy).toBe(150);
    expect(plan.dw).toBe(600);
    expect(plan.dh).toBe(300);
  });

  it('converts cm and inches to rounded pixels', () => {
    expect(physicalToPixels(2, 'in', 300)).toBe(600);
    expect(physicalToPixels(2.54, 'cm', 300)).toBe(300);
  });
});
