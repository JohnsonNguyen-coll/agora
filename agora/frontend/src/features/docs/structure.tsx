import { Children, cloneElement, isValidElement, type ReactNode, type ReactElement } from 'react';
import { articles } from './articles';
export const articleUrl = (slug: string) => slug ? '/docs/' + slug : '/docs';
export function textContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (isValidElement<{ children?: ReactNode }>(node)) return textContent(node.props.children);
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : String(child)).join(' ');
}
export function sectionsFor(body: ReactNode) {
  const children = isValidElement<{ children?: ReactNode }>(body) ? body.props.children : body;
  return Children.toArray(children).filter(isValidElement).map((section, index) => {
    const element = section as ReactElement<{ children?: ReactNode; id?: string }>;
    const heading = Children.toArray(element.props.children).find(child => isValidElement(child) && child.type === 'h2');
    const title = textContent(heading);
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section-' + index;
    return { id, title, text: textContent(element), node: cloneElement(element, { id, key: id }) };
  });
}
export const groups = [
  { title: 'Start here', slugs: ['', 'mcp'] },
  { title: 'The arena', slugs: ['rooms', 'matches', 'voting', 'tournaments'] },
  { title: 'Access & trust', slugs: ['accounts', 'latch', 'audit'] }
];
export const searchEntries = articles.flatMap(article => [
  { title: article.label, description: article.description, url: articleUrl(article.slug), text: article.title + ' ' + article.description },
  ...sectionsFor(article.body).map(section => ({ title: section.title, description: article.label, url: articleUrl(article.slug) + '#' + section.id, text: section.text }))
]);
