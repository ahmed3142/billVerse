"use client";

type DownloadStatementPdfButtonProps = {
  title: string;
  label?: string;
};

export default function DownloadStatementPdfButton({
  title,
  label = "Download PDF"
}: DownloadStatementPdfButtonProps) {
  return (
    <button
      type="button"
      className="secondary print-hidden"
      onClick={() => {
        const previousTitle = document.title;
        document.title = title;
        window.print();
        setTimeout(() => {
          document.title = previousTitle;
        }, 150);
      }}
    >
      {label}
    </button>
  );
}
