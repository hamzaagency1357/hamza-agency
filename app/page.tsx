export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          marginBottom: "20px",
        }}
      >
        Hamza Agency
      </h1>

      <p
        style={{
          maxWidth: "700px",
          fontSize: "20px",
          opacity: 0.8,
        }}
      >
        وكالة حمزة لإدارة وتوظيف صناع المحتوى على منصات البث المباشر.
      </p>
    </main>
  );
}
