type FlatOption = {
  id: string;
  flat_no: string;
};

type CategoryOption = {
  id: string;
  name: string;
};

type IndividualChargesGridProps = {
  flats: FlatOption[];
  categories: CategoryOption[];
  values: Record<string, string>;
  action: (formData: FormData) => void | Promise<void>;
};

export default function IndividualChargesGrid({
  flats,
  categories,
  values,
  action
}: IndividualChargesGridProps) {
  return (
    <form action={action} className="card stack">
      <div className="spaced">
        <h3>Individual Charges Grid</h3>
        <button type="submit">Save Grid</button>
      </div>
      <p className="muted">Leave blank to keep a cell unchanged. Enter 0 to clear an existing amount.</p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Flat</th>
              {categories.map((category) => (
                <th key={category.id}>{category.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flats.map((flat) => (
              <tr key={flat.id}>
                <td>{flat.flat_no}</td>
                {categories.map((category) => {
                  const key = `${flat.id}:${category.id}`;
                  return (
                    <td key={category.id}>
                      <input
                        name={`entry::${flat.id}::${category.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={values[key] ?? ""}
                        style={{ minWidth: 115 }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
