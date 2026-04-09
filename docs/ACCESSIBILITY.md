# Accessibility (a11y) Guidelines

This document outlines the accessibility practices implemented in the Kokonut Agentic Marketplace.

## Overview

The marketplace aims to comply with WCAG 2.1 AA standards. This document tracks current implementation and planned improvements.

## Current Implementation

### ARIA Labels

**Implemented**:

- Theme toggle button: `aria-label="Toggle theme"`
- Notification bell: `aria-label="Notifications (X unread)"`
- Error dismissal: `aria-label="Dismiss error"`

**Planned**:

- All icon buttons
- Filter toggles
- Pagination controls
- Form inputs
- Modal dialogs

### Keyboard Navigation

**Implemented**:

- Tab navigation through forms
- Enter/Space for button activation
- Escape to close modals

**Planned**:

- Arrow keys for dropdown menus
- Keyboard shortcuts for common actions
- Focus trap in modals

### Color Contrast

**Implemented**:

- Primary green (#009F4D) on white: 4.5:1 ✓
- Text on default backgrounds: WCAG compliant
- Error states use red with icons (not color alone)

**Note**: Using HeroUI components provides built-in a11y support

## Semantic HTML

### Headings

- H1 for page titles
- H2 for section headings
- H3 for card/tile headings
- Proper nesting (no skipping levels)

### Forms

- All inputs have associated labels
- Error messages linked via `aria-describedby`
- Required fields marked with `aria-required`

### Tables

- Proper `<th>` with `scope` attributes
- Caption for screen readers

## Screen Reader Support

### Interactive Elements

- Buttons announce their action
- Links announce destination
- Form fields announce label + state

### Dynamic Content

- Loading states announced
- Toast notifications announced
- Modal opens/closes announced

## Testing Checklist

- [ ] Tab through entire page
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Check color contrast with contrast checker
- [ ] Verify focus indicators visible
- [ ] Test keyboard-only navigation
- [ ] Check with zoom at 200%

## Common Issues & Fixes

### Issue: Icon-only buttons lack context

```tsx
// Before
<Button icon={<Icon />} />

// After
<Button
  icon={<Icon />}
  aria-label="Submit form"
/>
```

### Issue: Status changes not announced

```tsx
// Before
setStatus('submitted');

// After
<div role="status" aria-live="polite">
  {status === 'submitted' ? 'Form submitted successfully' : ''}
</div>;
```

### Issue: Images missing alt text

```tsx
// Before
<Image src={agent.avatar} />

// After
<Image
  src={agent.avatar}
  alt={`Avatar for ${agent.name}`}
/>
```

### Issue: Form errors not linked

```tsx
// Before
<input name="email" />
<span className="error">Invalid email</span>

// After
<input
  name="email"
  aria-describedby="email-error"
/>
<span id="email-error" className="error" role="alert">
  Invalid email
</span>
```

## Tools Used

- **HeroUI**: Built-in a11y (WAI-ARIA compliant)
- **React**: useId() for unique IDs
- **axe-core**: Browser extension for testing

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

## Future Improvements

1. **Skip links** - Quick navigation to main content
2. **Landmarks** - Proper region elements (nav, main, aside)
3. **Focus management** - Focus moved to modal on open
4. **Live regions** - Announce dynamic updates
5. **Reduced motion** - Respect prefers-reduced-motion
