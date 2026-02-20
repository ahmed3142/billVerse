type CategoryOption = {
  id: string;
  name: string;
};

type CommonChargesFormProps = {
  categories: CategoryOption[];
  action: (formData: FormData) => void | Promise<void>;
};

export default function CommonChargesForm({ categories, action }: CommonChargesFormProps) {
  return (
    <form action={action} className="card stack">
      <h3>Add/Update Common Charge</h3>
      <div>
        <label htmlFor="category_id">Category</label>
        <select id="category_id" name="category_id" required defaultValue="">
          <option value="" disabled>
            Select category
          </option>
          {categories.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="total_amount">Amount</label>
        <input id="total_amount" name="total_amount" type="number" step="0.01" min="0" required />
      </div>
      <div>
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} />
      </div>
      <div>
        <button type="submit">Save Common Charge</button>
      </div>
    </form>
  );
}
