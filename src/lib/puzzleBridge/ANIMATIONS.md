# Puzzle Animation System

The animation system provides visual feedback for puzzle interactions, enhancing user experience while maintaining accessibility standards.

## Features

- ✅ Visual feedback for correct/incorrect letters
- 🎉 Celebration animations for puzzle completion
- 💡 Hint reveal animations
- ✨ Active cell glow indicators
- 🎨 Customizable animation types
- ♿ Respects `prefers-reduced-motion`
- 🚀 Performant with CSS animations
- 🔌 Seamless iframe communication

## Architecture

The animation system consists of three main components:

### 1. CSS Animations (`styles/eclipsecrossword-theme.css`)

Defines keyframe animations and utility classes:
- `ecw-animate-correct` - Green pulse for correct letters
- `ecw-animate-incorrect` - Red shake for incorrect letters  
- `ecw-animate-celebrate` - Celebration effect
- `ecw-animate-hint` - Hint reveal effect
- `ecw-animate-glow` - Active cell indicator
- `ecw-animate-fadeIn` - Smooth entrance animation

### 2. Bridge Protocol (`types.ts`)

Adds `TRIGGER_ANIMATION` message type:
```typescript
{
  type: 'TRIGGER_ANIMATION';
  payload: {
    animationType: 'correct' | 'incorrect' | 'celebrate' | 'hint' | 'glow' | 'fadeIn';
    targetSelector: string;
    duration?: number;
    remove?: boolean;
  };
}
```

### 3. Animation Manager Hook (`useAnimationManager.ts`)

Provides convenient helpers for triggering animations:
```typescript
const animations = useAnimationManager({
  channelId,
  iframeRef,
  enabled: true,
});

// Trigger animations
animations.triggerCorrect([{ row: 0, col: 0 }]);
animations.triggerIncorrect([{ row: 1, col: 1 }]);
animations.triggerCelebrate('.ecw-box');
```

## Usage

### Basic Setup

```tsx
import { useAnimationManager } from '@/lib/puzzleBridge';

function PuzzleComponent() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const channelId = createChannelId('my-puzzle');

  const animations = useAnimationManager({
    channelId,
    iframeRef,
    enabled: true,
  });

  return <iframe ref={iframeRef} src="/puzzle.html" />;
}
```

### Integration with Validation

```tsx
const validationManager = useValidationManager(puzzleId, {
  animationManager: animations,
  enableAnimations: true,
  onValidated: (results) => {
    const allCorrect = results.every(r => r.isCorrect);
    if (allCorrect) {
      animations.triggerCelebrate();
    }
  },
});
```

### Manual Animation Triggers

```tsx
// Correct answer feedback
animations.triggerCorrect([
  { row: 0, col: 0 },
  { row: 0, col: 1 },
]);

// Incorrect answer feedback
animations.triggerIncorrect([
  { row: 1, col: 0 },
]);

// Hint animation
animations.triggerHint([{ row: 2, col: 2 }], {
  duration: 800,
});

// Active cell glow (persistent)
animations.triggerGlow('[data-row="0"][data-col="0"]', {
  remove: false,
});

// Celebration
animations.triggerCelebrate('.ecw-crosswordarea', {
  duration: 500,
});
```

### Custom Animations

```tsx
animations.triggerCustom(
  'myAnimation',
  '.my-selector',
  { duration: 600, remove: true }
);
```

## Accessibility

The animation system respects user preferences for reduced motion:

### CSS Level
```css
@media (prefers-reduced-motion: reduce) {
  .ecw-animate-* {
    animation: none !important;
  }
  
  /* Use simple state changes instead */
  .ecw-animate-correct {
    background-color: rgba(34, 197, 94, 0.15) !important;
    transition: background-color 0.2s ease;
  }
}
```

### React Level
```tsx
import { usePrefersReducedMotion } from '@/lib/puzzleBridge';

function PuzzleComponent() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const animations = useAnimationManager({
    channelId,
    iframeRef,
    enabled: !prefersReducedMotion,
  });

  // ...
}
```

## Animation Types

### Correct Letter
- **Trigger**: `triggerCorrect(cells)`
- **Effect**: Green pulse with border highlight
- **Duration**: 600ms
- **Use case**: Immediate feedback for correct letter entry

### Incorrect Letter
- **Trigger**: `triggerIncorrect(cells)`
- **Effect**: Red shake with border glow
- **Duration**: 400ms
- **Use case**: Immediate feedback for incorrect letter entry

### Celebration
- **Trigger**: `triggerCelebrate(selector)`
- **Effect**: Scale and rotate animation
- **Duration**: 500ms (default)
- **Use case**: Puzzle completion, word completion

### Hint
- **Trigger**: `triggerHint(cells)`
- **Effect**: Blue glow with scale animation
- **Duration**: 800ms (default)
- **Use case**: Revealing hints or clues

### Glow
- **Trigger**: `triggerGlow(selector)`
- **Effect**: Pulsing box-shadow
- **Duration**: Infinite (until removed)
- **Use case**: Active cell indicator, focus states

### Fade In
- **Trigger**: `triggerFadeIn(selector)`
- **Effect**: Opacity and translateY animation
- **Duration**: 300ms
- **Use case**: Element entrance animations

## Performance Considerations

### CSS-based Animations
All animations use CSS keyframes for optimal performance:
- GPU-accelerated transforms
- No JavaScript-based animation loops
- Automatic cleanup with `animationend` events

### Debouncing
Validation is debounced by default (300ms) to prevent excessive animation triggers:
```typescript
const validationManager = useValidationManager(puzzleId, {
  debounceMs: 300, // Adjust as needed
});
```

### RequestAnimationFrame
All animation triggers use `requestAnimationFrame` for smooth rendering:
```javascript
requestAnimationFrame(() => {
  triggerAnimation(animationType, targetSelector, duration);
});
```

## Browser Compatibility

Tested and supported in:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Fallback behavior:
- Animations gracefully degrade if CSS animations are not supported
- `prefers-reduced-motion` is respected across all browsers

## Iframe Communication

Animations are triggered via postMessage:

```javascript
// Parent → Iframe
iframe.contentWindow.postMessage({
  channelId: 'puzzle-123',
  type: 'TRIGGER_ANIMATION',
  payload: {
    animationType: 'correct',
    targetSelector: '[data-row="0"][data-col="0"]',
    duration: 600,
    remove: true,
  },
}, '*');

// Iframe handler
window.addEventListener('message', (e) => {
  if (e.data.type === 'TRIGGER_ANIMATION') {
    const { animationType, targetSelector, duration, remove } = e.data.payload;
    triggerAnimation(animationType, targetSelector, duration, remove);
  }
});
```

## Testing

To test animations:

1. **Visual Testing**: Use the example components in `__examples__/animation-usage.tsx`
2. **Browser Testing**: Test in Chrome, Firefox, and Safari
3. **Accessibility Testing**: Enable "prefers-reduced-motion" in browser settings
4. **Performance Testing**: Use Chrome DevTools Performance tab

Example test checklist:
- [ ] Correct letter animation displays green pulse
- [ ] Incorrect letter animation displays red shake
- [ ] Celebration animation triggers on puzzle completion
- [ ] Hint animation highlights cells properly
- [ ] Animations respect prefers-reduced-motion
- [ ] No animation jank or lag
- [ ] Animations clean up properly (no memory leaks)

## Extending the System

### Adding New Animation Types

1. **Add CSS keyframe**:
```css
@keyframes my-custom-animation {
  0% { /* start state */ }
  100% { /* end state */ }
}

.ecw-animate-myCustom {
  animation: my-custom-animation 0.5s ease-in-out;
}
```

2. **Update type definitions**:
```typescript
// types.ts
animationType: 'correct' | 'incorrect' | /* ... */ | 'myCustom';
```

3. **Add hook method** (optional):
```typescript
// useAnimationManager.ts
const triggerMyCustom = useCallback(
  (selector: string, options?: AnimationOptions) => {
    sendAnimationMessage('myCustom', selector, options);
  },
  [sendAnimationMessage]
);
```

## Troubleshooting

### Animations not working
- Check iframe is loaded and contentWindow is available
- Verify channelId matches between parent and iframe
- Check browser console for postMessage errors
- Ensure CSS file is properly loaded in iframe

### Animations feel laggy
- Check CSS animation uses transform/opacity (GPU accelerated)
- Reduce animation duration
- Use will-change CSS property sparingly
- Profile with Chrome DevTools Performance tab

### Animations conflict with existing styles
- Increase CSS specificity with !important
- Use more specific selectors
- Check z-index stacking context
- Verify no conflicting animations

## Best Practices

1. **Use debouncing** for validation-triggered animations
2. **Respect user preferences** for reduced motion
3. **Keep animations short** (< 1 second)
4. **Clean up persistent animations** when no longer needed
5. **Test across browsers** and devices
6. **Profile performance** regularly
7. **Provide fallbacks** for older browsers

## Related Documentation

- [Puzzle Bridge README](./README.md)
- [Validation Manager](./validationManager.ts)
- [CSS Injection Manager](./cssInjectionManager.ts)
- [Animation Examples](./__examples__/animation-usage.tsx)
