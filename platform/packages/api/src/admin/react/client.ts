import { AdminNavigationFallback } from './AdminNavigationFallback.tsx';
import { configureCodeHighlighting } from './code-highlighting.ts';
import { adminComponents, adminLayoutTree } from './pages.ts';
import { startAdminSpa } from './spa.tsx';
import './styles.css';

configureCodeHighlighting(() =>
  import('./code-highlighter.ts').then((module) => module.highlightCode),
);

startAdminSpa({
  components: adminComponents,
  layoutTree: adminLayoutTree,
  navigationFallback: AdminNavigationFallback,
});
