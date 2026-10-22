import SelectMenu from './SelectMenu';
import { SORT_OPTIONS } from '../data/matchning';

const OPTIONS = SORT_OPTIONS.map((option) => ({ value: option.id, label: option.label }));

// Sortering som én knap, der åbner en liste (i stedet for en række knapper). full fylder bredden.
export default function SortPicker({ sortBy, onChange, full = false }) {
  return (
    <SelectMenu
      icon="swap-vertical"
      title="Sortér efter"
      value={sortBy}
      options={OPTIONS}
      onChange={onChange}
      full={full}
    />
  );
}
