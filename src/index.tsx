import { render } from 'solid-js/web';
import { Shell } from './components/layout/Shell';
import './styles/theme.css';

const root = document.getElementById('root');

if (root) {
  render(() => <Shell />, root);
}
