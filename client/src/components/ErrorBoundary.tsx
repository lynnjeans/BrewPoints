import { Component, type ReactNode } from 'react'

// Minimal error boundary so a failing child (e.g. the camera Scanner on a device with no camera)
// renders a fallback instead of blanking the whole page.
export class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
