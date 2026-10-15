import { Component } from 'react'

// The playful effects are decoration: if one ever throws, it must disappear quietly, never take the page with it.
export default class EggBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.warn('A playful effect failed and was switched off:', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
