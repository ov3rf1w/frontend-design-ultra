# Accessibility WCAG Recipes

Use when `/accessibility`, `/verify`, forms, dashboards, e-commerce, mobile, or complex interactions appear.

## WCAG 2.2 AA-Oriented Gate

Check:

- keyboard access for all interactive controls
- visible focus not obscured
- pointer cancellation for custom controls
- target size minimum where practical
- alternatives for dragging movements
- redundant entry avoided in forms
- accessible authentication where relevant
- reflow without horizontal scrolling
- contrast for text and non-text UI
- labels, name/role/value, error identification

## Forms

- labels above inputs; placeholder is not label
- required/error/helper text programmatically associated
- validation does not rely on color alone
- errors summarized near submit and inline near field
- disabled state remains readable

## Complex Widgets

Map widgets to expected keyboard behavior before styling:

- dialog: focus trap, escape, restore focus
- tabs: arrow keys or documented tab behavior
- menu/listbox/combobox: APG-aligned roles and keyboard model
- drag/drop: button or keyboard alternative

## Motion Accessibility

Respect `prefers-reduced-motion`. Reduced mode must show complete final content, not hidden pre-animation states.

