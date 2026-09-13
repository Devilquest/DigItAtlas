import { Fragment } from 'react';

import { dataUrl } from '../../data/client';
import {
  GUIDE_BLOCKS,
  GUIDE_CLOSING,
  LABELS_HEADING,
  LABELS_LEAD,
  LABEL_COLORS,
  guideParts,
} from '../../domain/guide';
import type { Tag } from '../../domain/types';
import Dialog from '../controls/Dialog';
import './UserGuide.css';

interface UserGuideProps {
  /** The catalog's labels, which the color rows take their example picture and its size from. */
  tags: Record<string, Tag>;
  open: boolean;
  onShortcuts: () => void;
  onClose: () => void;
}

interface ParagraphProps {
  body: string;
  className?: string;
  onLink?: () => void;
}

/** Halved exactly, so an example keeps square pixels at a size a paragraph can sit beside. */
const SCALE = 2;

/** One paragraph, with every key it names drawn as a key rather than written into the sentence. */
function Paragraph({ body, className, onLink }: ParagraphProps) {
  return (
    <p className={className}>
      {guideParts(body).map((part, at) => {
        if (part.kind === 'key') {
          return (
            <kbd className="guide-key" key={at}>
              {part.text}
            </kbd>
          );
        }
        if (part.kind === 'link') {
          return (
            <button type="button" className="guide-link" key={at} onClick={onLink}>
              {part.text}
            </button>
          );
        }
        return <Fragment key={at}>{part.text}</Fragment>;
      })}
    </p>
  );
}

/** The guide: how to get around the atlas, and what the color of a destination label means. */
export default function UserGuide({ tags, open, onShortcuts, onClose }: UserGuideProps) {
  return (
    <Dialog title="User guide" open={open} wide onClose={onClose}>
      <div className="guide">
        {GUIDE_BLOCKS.map((block) => (
          <section key={block.heading}>
            <h3 className="guide-heading">{block.heading}</h3>
            <Paragraph body={block.body} />
          </section>
        ))}

        <section>
          <h3 className="guide-heading">{LABELS_HEADING}</h3>
          <p>{LABELS_LEAD}</p>
          <dl className="guide-colors">
            {LABEL_COLORS.map((row) => {
              const tag = tags[row.tag];
              return (
                <Fragment key={row.tag}>
                  <dt>
                    {tag && (
                      <img
                        className="guide-tag"
                        src={dataUrl(`tags/${tag.sprite}`)}
                        alt=""
                        width={Math.round(tag.w / SCALE)}
                        height={Math.round(tag.h / SCALE)}
                      />
                    )}
                  </dt>
                  {/* Named in words too: a green row beside a red one is not readable by color alone. */}
                  <dd>
                    <strong>{row.color}.</strong> {row.means}
                  </dd>
                </Fragment>
              );
            })}
          </dl>
        </section>

        <Paragraph body={GUIDE_CLOSING} className="guide-closing" onLink={onShortcuts} />
      </div>
    </Dialog>
  );
}
