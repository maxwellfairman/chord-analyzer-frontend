import { nanoid } from "nanoid";
function ChordTable(props) {
  return (
    <table>
      <caption>{props.title}</caption>

      <thead>
        <tr>
          <th></th>
          <th>Interpetation 1</th>
          <th>Interpretation 2</th>
        </tr>
      </thead>

      <tbody>
        {props.analysis.rows.map((row) => (
          <tr key={nanoid()}>
            <th>{row.label}</th>
            <td>
              <span className="chord-main">{row.guess1.main}</span>
              <sup className="chord-extension">{row.guess1.sup}</sup>
              <span className="slash-chord">{row.guess1.slash}</span>
            </td>
            <td>
              <span className="chord-main">{row.guess2.main}</span>
              <sup className="chord-extension">{row.guess2.sup}</sup>
              <span className="slash-chord">{row.guess2.slash}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
export default ChordTable;
