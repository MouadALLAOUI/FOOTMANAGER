import { Component } from 'react'
import GenericError from './GenericError'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    // Detailed errors stay in the developer log only, never rendered to users.
    console.error('Application error:', error)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return <GenericError onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}
