# Mobile Component Library

A comprehensive set of mobile-optimized React components designed specifically for field operators and mobile-first experiences.

## 🎯 Design Principles

- **Touch-First**: All components optimized for touch interactions
- **Accessibility**: WCAG 2.1 AA compliant
- **Performance**: Smooth 60fps animations
- **Consistency**: Unified design system across all components

## 📱 Components

### MobileButton

A touch-optimized button component with multiple variants and sizes.

```tsx
import { MobileButton } from '@/components/mobile';

// Basic usage
<MobileButton variant="primary" size="large">
  Click Me
</MobileButton>

// With icon and loading state
<MobileButton
  variant="primary"
  size="medium"
  icon={<SaveIcon />}
  loading={isLoading}
  touchFeedback
>
  Save Task
</MobileButton>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'success' \| 'warning' \| 'outline'` | `'primary'` | Button style variant |
| `size` | `'small' \| 'medium' \| 'large' \| 'xlarge'` | `'medium'` | Button size |
| `loading` | `boolean` | `false` | Show loading spinner |
| `icon` | `ReactNode` | - | Icon to display |
| `fullWidth` | `boolean` | `false` | Take full width |
| `touchFeedback` | `boolean` | `true` | Enable ripple effect |

#### Sizes

- **Small**: 40px height, 14px font
- **Medium**: 48px height, 16px font
- **Large**: 56px height, 18px font
- **XLarge**: 64px height, 20px font

### MobileInput

A mobile-optimized input component with floating labels and validation.

```tsx
import { MobileInput } from '@/components/mobile';

// Basic usage
<MobileInput
  label="Task Name"
  placeholder="Enter task name"
  size="large"
/>

// With floating label
<MobileInput
  variant="floating"
  label="Search Materials"
  searchIcon
  showClearButton
/>

// Password input
<MobileInput
  type="password"
  label="Password"
  showPasswordToggle
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'outlined' \| 'filled' \| 'floating'` | `'outlined'` | Input style variant |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Input size |
| `showClearButton` | `boolean` | `false` | Show clear button when has value |
| `showPasswordToggle` | `boolean` | `false` | Show password visibility toggle |
| `searchIcon` | `boolean` | `false` | Show search icon |
| `errorMessage` | `string` | - | Error message to display |

### MobileCard

A versatile card component with swipe actions and status indicators.

```tsx
import { MobileCard } from '@/components/mobile';

// Basic task card
<MobileCard
  title="Install HVAC System"
  subtitle="Building A - Floor 2"
  description="Complete installation of the new HVAC system"
  status="in-progress"
  priority="high"
  progress={65}
  onTap={() => navigateToTask()}
/>

// Swipeable card with actions
<MobileCard
  title="Material Request"
  status="pending"
  swipeable
  onSwipeLeft={() => rejectRequest()}
  onSwipeRight={() => approveRequest()}
  actions={
    <MobileButton size="small" variant="outline">
      View Details
    </MobileButton>
  }
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Card size |
| `variant` | `'default' \| 'elevated' \| 'outlined' \| 'filled'` | `'default'` | Card style variant |
| `title` | `string` | - | Card title |
| `subtitle` | `string` | - | Card subtitle |
| `description` | `string` | - | Card description |
| `status` | `'pending' \| 'in-progress' \| 'completed' \| 'overdue' \| 'cancelled'` | - | Task status |
| `priority` | `'low' \| 'medium' \| 'high' \| 'urgent'` | - | Task priority |
| `progress` | `number` | - | Progress percentage (0-100) |
| `swipeable` | `boolean` | `false` | Enable swipe gestures |
| `onSwipeLeft` | `() => void` | - | Callback for left swipe |
| `onSwipeRight` | `() => void` | - | Callback for right swipe |
| `onTap` | `() => void` | - | Callback for tap/click |
| `selectable` | `boolean` | `false` | Enable selection |
| `selected` | `boolean` | `false` | Selection state |
| `icon` | `ReactNode` | - | Icon to display |
| `badge` | `string \| number` | - | Badge content |
| `timestamp` | `string` | - | Timestamp text |
| `location` | `string` | - | Location text |

## 🎨 Design System

### Colors

```css
/* Primary Colors */
--primary-50: #eff6ff;
--primary-500: #3b82f6;
--primary-600: #2563eb;
--primary-700: #1d4ed8;

/* Status Colors */
--success-500: #22c55e;
--warning-500: #f59e0b;
--error-500: #ef4444;
```

### Typography

```css
/* Mobile Typography Scale */
--text-xs: 12px;    /* Small labels */
--text-sm: 14px;    /* Body text */
--text-base: 16px;  /* Primary text */
--text-lg: 18px;    /* Large text */
--text-xl: 20px;    /* Headings */
--text-2xl: 24px;   /* Large headings */
```

### Spacing

```css
/* Mobile Spacing Scale */
--space-1: 4px;     /* Micro spacing */
--space-2: 8px;     /* Small spacing */
--space-3: 12px;    /* Medium spacing */
--space-4: 16px;    /* Large spacing */
--space-6: 24px;    /* Extra large spacing */
```

### Touch Targets

All interactive elements meet minimum touch target requirements:

- **Small**: 40px minimum
- **Medium**: 48px minimum (recommended)
- **Large**: 56px minimum
- **XLarge**: 64px minimum

## 🚀 Usage Examples

### Task Management Interface

```tsx
import { MobileCard, MobileButton, MobileInput } from '@/components/mobile';

function TaskList() {
  return (
    <Box>
      {/* Search Input */}
      <MobileInput
        variant="floating"
        label="Search Tasks"
        searchIcon
        showClearButton
        size="large"
        sx={{ mb: 3 }}
      />

      {/* Task Cards */}
      {tasks.map(task => (
        <MobileCard
          key={task.id}
          title={task.title}
          subtitle={task.location}
          description={task.description}
          status={task.status}
          priority={task.priority}
          progress={task.progress}
          timestamp={task.dueDate}
          swipeable
          onSwipeLeft={() => markComplete(task.id)}
          onSwipeRight={() => startTask(task.id)}
          onTap={() => openTaskDetails(task.id)}
          actions={
            <MobileButton size="small" variant="outline">
              View Details
            </MobileButton>
          }
        />
      ))}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <MobileButton variant="primary" size="large" fullWidth>
          Create Task
        </MobileButton>
        <MobileButton variant="secondary" size="large" fullWidth>
          View Calendar
        </MobileButton>
      </Box>
    </Box>
  );
}
```

### Form Interface

```tsx
function TaskForm() {
  return (
    <Box>
      <MobileInput
        label="Task Name"
        placeholder="Enter task name"
        size="large"
        required
      />

      <MobileInput
        label="Description"
        placeholder="Enter task description"
        multiline
        rows={4}
        size="large"
      />

      <MobileInput
        label="Location"
        placeholder="Enter location"
        size="large"
      />

      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <MobileButton variant="primary" size="large" fullWidth>
          Save Task
        </MobileButton>
        <MobileButton variant="outline" size="large" fullWidth>
          Cancel
        </MobileButton>
      </Box>
    </Box>
  );
}
```

## 🔧 Customization

### Theme Integration

All components integrate with Material-UI's theme system:

```tsx
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3b82f6',
      dark: '#2563eb',
    },
    // ... other theme options
  },
});
```

### Custom Styling

Components accept standard MUI `sx` prop for custom styling:

```tsx
<MobileButton
  variant="primary"
  sx={{
    borderRadius: '20px',
    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
  }}
>
  Custom Button
</MobileButton>
```

## 📱 Mobile Optimizations

### Touch Interactions

- **Ripple Effects**: Visual feedback on touch
- **Haptic Feedback**: Vibration on supported devices
- **Swipe Gestures**: Natural mobile interactions
- **Touch Targets**: Minimum 44px for accessibility

### Performance

- **Smooth Animations**: 60fps transitions
- **Optimized Rendering**: Minimal re-renders
- **Bundle Size**: Tree-shakeable components
- **Memory Efficient**: Proper cleanup and optimization

### Accessibility

- **Screen Reader Support**: Proper ARIA labels
- **Keyboard Navigation**: Full keyboard support
- **High Contrast**: WCAG AA compliant colors
- **Focus Management**: Clear focus indicators

## 🧪 Testing

### Component Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileButton } from '@/components/mobile';

test('MobileButton handles click events', () => {
  const handleClick = jest.fn();
  render(
    <MobileButton onClick={handleClick}>
      Click Me
    </MobileButton>
  );

  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Touch Testing

```tsx
import { fireEvent } from '@testing-library/react';

test('MobileCard handles swipe gestures', () => {
  const handleSwipeLeft = jest.fn();
  render(
    <MobileCard swipeable onSwipeLeft={handleSwipeLeft}>
      Swipeable Card
    </MobileCard>
  );

  const card = screen.getByRole('button');
  fireEvent.touchStart(card, { touches: [{ clientX: 100 }] });
  fireEvent.touchMove(card, { touches: [{ clientX: 50 }] });
  fireEvent.touchEnd(card);

  expect(handleSwipeLeft).toHaveBeenCalled();
});
```

## 📚 Best Practices

### Performance

1. **Use appropriate sizes**: Choose the right size for the context
2. **Minimize re-renders**: Use React.memo for expensive components
3. **Lazy load**: Load components only when needed
4. **Optimize images**: Use appropriate image sizes

### Accessibility

1. **Provide labels**: Always include proper labels
2. **Use semantic HTML**: Choose appropriate HTML elements
3. **Test with screen readers**: Verify accessibility
4. **Provide alternatives**: Include text alternatives for icons

### UX

1. **Consistent spacing**: Use the design system spacing
2. **Clear hierarchy**: Use appropriate typography scales
3. **Feedback**: Provide visual feedback for all interactions
4. **Error handling**: Show clear error messages

## 🔄 Migration Guide

### From Standard MUI Components

```tsx
// Before
<Button variant="contained" size="large">
  Click Me
</Button>

// After
<MobileButton variant="primary" size="large">
  Click Me
</MobileButton>
```

### From Custom Components

```tsx
// Before
<CustomCard>
  <CardTitle>Task Name</CardTitle>
  <CardContent>Description</CardContent>
</CustomCard>

// After
<MobileCard
  title="Task Name"
  description="Description"
  onTap={() => handleTap()}
/>
```

## 🐛 Troubleshooting

### Common Issues

1. **Touch events not working**: Ensure proper touch event handlers
2. **Styling conflicts**: Check for CSS specificity issues
3. **Performance issues**: Use React DevTools to identify bottlenecks
4. **Accessibility issues**: Test with screen readers

### Debug Mode

Enable debug mode for development:

```tsx
<MobileButton debug>
  Debug Button
</MobileButton>
```

## 📈 Roadmap

### Upcoming Features

- [ ] **MobileDatePicker**: Touch-optimized date selection
- [ ] **MobileTimePicker**: Time selection component
- [ ] **MobileFileUpload**: File upload with camera integration
- [ ] **MobileSignature**: Digital signature component
- [ ] **MobileBarcodeScanner**: Barcode scanning component

### Performance Improvements

- [ ] **Virtual Scrolling**: For large lists
- [ ] **Image Optimization**: Automatic image compression
- [ ] **Offline Support**: Service worker integration
- [ ] **Bundle Splitting**: Code splitting for better performance

---

For more information, see the [Field Environment Master Plan](../../FIELD_ENVIRONMENT_MASTER_PLAN.md).
