import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DataGrid, {
  DataGridDefaultRenderersProvider,
  renderSortIcon,
  SelectColumn
} from '../../src';
import type {
  CellRendererProps,
  Column,
  DataGridProps,
  RenderSortStatusProps,
  SortColumn
} from '../../src';
import { getCells, getHeaderCells, getRows, setup } from './utils';

interface Row {
  id: number;
  col1: string;
  col2: string;
}

const noRows: readonly Row[] = [];

const columns: readonly Column<Row>[] = [
  SelectColumn,
  {
    key: 'col1',
    name: 'Column1',
    sortable: true
  },
  {
    key: 'col2',
    name: 'Column2',
    sortable: true
  }
];

function globalCellRenderer(key: React.Key, props: CellRendererProps<Row, unknown>) {
  return (
    <div key={key} role="gridcell">
      {props.row[props.column.key as keyof Row]}
    </div>
  );
}

function localCellRenderer(key: React.Key) {
  return (
    <div key={key} role="gridcell">
      local
    </div>
  );
}

function NoRowsFallback() {
  return <div>Local no rows fallback</div>;
}

function GlobalNoRowsFallback() {
  return <div>Global no rows fallback</div>;
}

function localRenderCheckbox() {
  return <div>Local checkbox</div>;
}

function globalRenderCheckbox() {
  return <div>Global checkbox</div>;
}

function globalSortStatus({ sortDirection, priority }: RenderSortStatusProps) {
  return (
    <>
      {renderSortIcon({ sortDirection })}
      <span data-testid="global-sort-priority">{priority}</span>
    </>
  );
}

function renderSortStatus({ sortDirection, priority }: RenderSortStatusProps) {
  return (
    <>
      {renderSortIcon({ sortDirection })}
      <span data-testid="local-sort-priority">{priority}</span>
    </>
  );
}

function TestGrid<R, SR, K extends React.Key>(props: DataGridProps<R, SR, K>) {
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);

  return <DataGrid {...props} sortColumns={sortColumns} onSortColumnsChange={setSortColumns} />;
}

function setupProvider<R, SR, K extends React.Key>(props: DataGridProps<R, SR, K>) {
  return render(
    <DataGridDefaultRenderersProvider
      value={{
        noRowsFallback: <GlobalNoRowsFallback />,
        renderCheckbox: globalRenderCheckbox,
        renderSortStatus: globalSortStatus,
        renderCell: globalCellRenderer
      }}
    >
      <TestGrid {...props} />
    </DataGridDefaultRenderersProvider>
  );
}

test('fallback defined using renderers prop with no rows', () => {
  setup({ columns, rows: noRows, renderers: { noRowsFallback: <NoRowsFallback /> } });

  expect(getRows()).toHaveLength(0);
  expect(screen.getByText('Local no rows fallback')).toBeInTheDocument();
});

test('fallback defined using provider with no rows', () => {
  setupProvider({ columns, rows: noRows });

  expect(getRows()).toHaveLength(0);
  expect(screen.getByText('Global no rows fallback')).toBeInTheDocument();
});

test('fallback defined using both provider and renderers with no rows', () => {
  setupProvider({ columns, rows: noRows, renderers: { noRowsFallback: <NoRowsFallback /> } });

  expect(getRows()).toHaveLength(0);
  expect(screen.getByText('Local no rows fallback')).toBeInTheDocument();
});

test('fallback defined using renderers prop with a row', () => {
  setup({
    columns,
    rows: [{ id: 1, col1: 'col 1 value', col2: 'col 2 value' }],
    renderers: { noRowsFallback: <NoRowsFallback /> }
  });

  expect(getRows()).toHaveLength(1);
  expect(screen.queryByText('Local no rows fallback')).not.toBeInTheDocument();
});

test('fallback defined using provider with a row', () => {
  setupProvider({ columns, rows: [{ id: 1, col1: 'col 1 value', col2: 'col 2 value' }] });

  expect(getRows()).toHaveLength(1);
  expect(screen.queryByText('Global no rows fallback')).not.toBeInTheDocument();
});

test('fallback defined using both provider and renderers with a row', () => {
  setupProvider({
    columns,
    rows: [{ id: 1, col1: 'col 1 value', col2: 'col 2 value' }],
    renderers: { noRowsFallback: <NoRowsFallback /> }
  });

  expect(getRows()).toHaveLength(1);
  expect(screen.queryByText('Global no rows fallback')).not.toBeInTheDocument();
  expect(screen.queryByText('Local no rows fallback')).not.toBeInTheDocument();
});

test('checkbox defined using renderers prop', () => {
  setup({ columns, rows: noRows, renderers: { renderCheckbox: localRenderCheckbox } });

  expect(getRows()).toHaveLength(0);
  expect(screen.getByText('Local checkbox')).toBeInTheDocument();
});

test('checkbox defined using provider', () => {
  setupProvider({ columns, rows: noRows });

  expect(getRows()).toHaveLength(0);
  expect(screen.getByText('Global checkbox')).toBeInTheDocument();
});

test('checkbox defined using both provider and renderers', () => {
  setupProvider({ columns, rows: noRows, renderers: { renderCheckbox: localRenderCheckbox } });

  expect(getRows()).toHaveLength(0);
  expect(screen.getByText('Local checkbox')).toBeInTheDocument();
  expect(screen.queryByText('Global checkbox')).not.toBeInTheDocument();
});

test('sortPriority defined using both providers', async () => {
  setupProvider({ columns, rows: noRows });

  const [, headerCell2, headerCell3] = getHeaderCells();
  const user = userEvent.setup();
  await user.click(headerCell2);
  await user.keyboard('{Control>}');
  await user.click(headerCell3);

  const p = screen.getAllByTestId('global-sort-priority');
  expect(p[0]).toHaveTextContent('1');
  expect(p[1]).toHaveTextContent('2');

  expect(screen.queryByTestId('local-sort-priority')).not.toBeInTheDocument();
});

test('sortPriority defined using both providers and renderers', async () => {
  setupProvider({ columns, rows: noRows, renderers: { renderSortStatus } });

  const [, headerCell2, headerCell3] = getHeaderCells();
  const user = userEvent.setup();
  await user.click(headerCell3);
  await user.keyboard('{Control>}');
  await user.click(headerCell2);

  const p = screen.getAllByTestId('local-sort-priority');
  expect(p[0]).toHaveTextContent('2');
  expect(p[1]).toHaveTextContent('1');

  expect(screen.queryByTestId('global-sort-priority')).not.toBeInTheDocument();
});

test('renderCell defined using provider', () => {
  setupProvider({ columns, rows: [{ id: 1, col1: 'col 1 value', col2: 'col 2 value' }] });

  const [, cell1, cell2] = getCells();
  expect(cell1).toHaveTextContent('col 1 value');
  expect(cell2).toHaveTextContent('col 2 value');
});

test('renderCell defined using both providers and renderers', () => {
  setupProvider({
    columns,
    rows: [{ id: 1, col1: 'col 1 value', col2: 'col 2 value' }],
    renderers: { renderCell: localCellRenderer }
  });

  const [selectCell, cell1, cell2] = getCells();
  expect(selectCell).toHaveTextContent('local');
  expect(cell1).toHaveTextContent('local');
  expect(cell2).toHaveTextContent('local');
});
