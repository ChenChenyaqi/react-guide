import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>hello world {count}</div>
    </>
  );
}

export default App;
