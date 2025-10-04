# 🚀 Future Enhancements for shadcn/ui Migration

## Overview

Following the successful migration of 8/9 components to shadcn/ui, this issue tracks remaining tasks and potential improvements to further enhance the UI.

## Remaining Migration Tasks

### High Priority

- [ ] **Migrate MessageList component** (307 lines)
  - Complex component with custom message rendering
  - Branch visualization and inline selectors
  - Tool call/result display integration
  - Streaming indicators
  - Currently works with existing CSS, can be migrated incrementally

### Testing & Quality Assurance

- [ ] **Add visual regression tests**
  - Consider Chromatic, Percy, or similar tools
  - Ensure no UI regressions during future updates
  - Test across different browsers and viewports

- [ ] **Document component usage patterns**
  - Create usage guide for shadcn/ui components
  - Document best practices for theming
  - Add examples for common patterns

### Performance Optimization

- [ ] **Optimize bundle size**
  - Configure Tailwind PurgeCSS for production
  - Tree-shake unused Tailwind classes
  - Analyze and reduce JavaScript bundle size
  - Consider code-splitting strategies

## Potential Improvements

### Additional Components

- [ ] **Table component** - For data display (file lists, branch metadata)
- [ ] **Tooltip component** - For better UX on hover states
- [ ] **Popover component** - For contextual menus and actions
- [ ] **Command component** - For keyboard-driven navigation
- [ ] **Toast/Notification component** - For user feedback
- [ ] **Dropdown Menu component** - For context menus

### Feature Enhancements

- [ ] **Dark mode toggle UI**
  - Theme system already supports dark mode
  - Need UI toggle and persistence
  - Ensure all components work in dark mode

- [ ] **Component stories for Storybook**
  - Document all migrated components
  - Provide interactive examples
  - Enable visual testing

- [ ] **Animation variants**
  - Add Tailwind animation utilities
  - Enhance transitions and micro-interactions
  - Improve user feedback

### Developer Experience

- [ ] **Component templates**
  - Create templates for common patterns
  - Standardize component creation
  - Reduce boilerplate code

- [ ] **Linting and code quality**
  - Add ESLint rules for component consistency
  - Ensure Tailwind class ordering
  - Enforce accessibility standards

## Success Criteria

- MessageList component migrated to shadcn/ui
- Visual regression tests in place
- Bundle size optimized (target: <100KB gzipped for JS)
- Dark mode fully functional with toggle
- Documentation complete for all components

## Priority

**Medium** - These enhancements will improve the codebase but are not blocking current functionality

## Dependencies

- Current shadcn/ui migration (completed: 8/9 components)
- Tailwind CSS 3.x configuration
- TypeScript 5.x setup

## Related

- Original migration issue: #20

---

**Note**: This issue can be broken down into smaller, focused issues for each task as work progresses.
