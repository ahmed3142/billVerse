type FlatOption = {
  id: string;
  flat_no: string;
};

type PaymentFormProps = {
  flats: FlatOption[];
  action: (formData: FormData) => void | Promise<void>;
};

export default function PaymentForm({ flats, action }: PaymentFormProps) {
  return (
    <form action={action} className="card stack">
      <h3>Add Payment</h3>
      <div>
        <label htmlFor="flat_id">Flat</label>
        <select id="flat_id" name="flat_id" required defaultValue="">
          <option value="" disabled>
            Select flat
          </option>
          {flats.map((flat) => (
            <option key={flat.id} value={flat.id}>
              {flat.flat_no}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="amount">Amount</label>
        <input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
      </div>
      <div>
        <label htmlFor="paid_on">Paid on</label>
        <input id="paid_on" name="paid_on" type="date" required />
      </div>
      <div>
        <label htmlFor="method">Method</label>
        <input id="method" name="method" placeholder="cash / bank transfer / mobile banking" />
      </div>
      <div>
        <label htmlFor="reference">Reference</label>
        <input id="reference" name="reference" placeholder="Txn ID / note" />
      </div>
      <div>
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} />
      </div>
      <div>
        <button type="submit">Save Payment</button>
      </div>
    </form>
  );
}
