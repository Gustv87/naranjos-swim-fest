interface FooterGMProps {
  dark?: boolean;
}

export const FooterGM = ({ dark = false }: FooterGMProps) => {
  return (
    <footer
      style={{
        padding: '14px 16px',
        font: '14px/1.4 system-ui, Segoe UI, Roboto, Arial',
        borderTop: dark ? '1px solid #1f2937' : '1px solid #eee',
        background: dark ? '#0f172a' : '#fff',
        color: dark ? '#dbe2f1' : '#111',
      }}
    >
      <span style={{ opacity: 0.8, marginRight: 8 }}>Desarrollado por</span>
      <a
        href="mailto:gustavomartinezh87@gmail.com"
        style={{
          fontWeight: 600,
          textDecoration: 'none',
          color: dark ? '#fff' : '#111',
        }}
      >
        GM Dev Studio
      </a>
    </footer>
  );
};
