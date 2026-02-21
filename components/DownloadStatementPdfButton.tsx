"use client";

type DownloadStatementPdfButtonProps = {
  title: string;
};

export default function DownloadStatementPdfButton({ title }: DownloadStatementPdfButtonProps) {
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
      Download PDF
    </button>
  );
}
