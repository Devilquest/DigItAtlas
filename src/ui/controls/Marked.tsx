import { markedLabel } from '../../domain/format';

interface MarkedProps {
  label: string;
  /** What was searched for, which is marked wherever the label carries it. */
  text: string;
}

/** A label with the searched-for part marked, in whichever panel searches. */
export default function Marked({ label, text }: MarkedProps) {
  const { before, hit, after } = markedLabel(label, text);
  if (hit === '') return <>{before}</>;
  return (
    <>
      {before}
      <mark className="match">{hit}</mark>
      {after}
    </>
  );
}
