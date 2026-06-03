export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #22003d 0%, #0a0a0a 50%, #000000 100%)",
        color: "#fff",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <img
        src="/Logo hamza agency.jpg"
        alt="Hamza Agency"
        style={{
          width: "180px",
          margin: "40px auto",
          display: "block",
          borderRadius: "20px",
        }}
      />

      <h1
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          marginBottom: "20px",
        }}
      >
        وكالة حمزة
      </h1>

      <p
        style={{
          maxWidth: "800px",
          margin: "auto",
          fontSize: "22px",
          lineHeight: "2",
          opacity: 0.9,
        }}
      >
        وكالة احترافية لإدارة وتطوير صناع المحتوى على TikTok و BIGO LIVE
        والمنصات الحديثة.
      </p>

      <div
        style={{
          marginTop: "50px",
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <a
          href="https://wa.me/905011730377"
          style={{
            background: "#a020f0",
            color: "white",
            padding: "16px 35px",
            borderRadius: "999px",
          }}
        >
          انضم الآن
        </a>

        <a
          href="https://wa.me/905011730377"
          style={{
            border: "1px solid #666",
            color: "white",
            padding: "16px 35px",
            borderRadius: "999px",
          }}
        >
          تواصل معنا
        </a>
      </div>
    </main>
  );
}
