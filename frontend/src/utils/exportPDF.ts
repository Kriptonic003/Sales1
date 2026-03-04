import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportData {
    productName: string;
    brandName: string;
    date: string;
    predictedDropPct: number;
    lossProbability: number;
    riskLevel: string;
    explanation: string;
    negativePct: number;
    totalPosts: number;
    avgSentiment: number;
}

// ── Colour palette (white background edition) ───────────────────
const BRAND_CYAN: [number, number, number] = [6, 182, 212];   // cyan-500
const PAGE_BG: [number, number, number] = [255, 255, 255];   // white
const CARD_BG: [number, number, number] = [241, 245, 249];   // slate-100
const TEXT_DARK: [number, number, number] = [15, 23, 42];    // near-black
const TEXT_MID: [number, number, number] = [71, 85, 105];    // slate-600
const TEXT_LIGHT: [number, number, number] = [148, 163, 184];     // slate-400
const TRACK_BG: [number, number, number] = [203, 213, 225];     // slate-300

function riskColor(risk: string): [number, number, number] {
    if (risk === "High") return [220, 38, 38];
    if (risk === "Medium") return [234, 88, 12];
    return [22, 163, 74];
}

/* Draw a progress bar */
function bar(
    pdf: jsPDF,
    x: number, y: number, w: number, h: number,
    pct: number,
    color: [number, number, number]
) {
    pdf.setFillColor(...TRACK_BG);
    pdf.roundedRect(x, y, w, h, h / 2, h / 2, "F");
    if (pct > 0) {
        const fw = Math.max(h, Math.min((pct / 100) * w, w));
        pdf.setFillColor(...color);
        pdf.roundedRect(x, y, fw, h, h / 2, h / 2, "F");
    }
}

/* Draw a filled circle dot (replaces emoji) */
function dot(pdf: jsPDF, x: number, y: number, r: number, color: [number, number, number]) {
    pdf.setFillColor(...color);
    pdf.circle(x, y, r, "F");
}

/* Capture a DOM element and embed as image */
async function embedElement(
    pdf: jsPDF, el: HTMLElement,
    x: number, y: number, maxW: number, maxH: number
): Promise<number> {
    const canvas = await html2canvas(el, {
        backgroundColor: "#f1f5f9",
        scale: 1.5,
        useCORS: true,
        logging: false,
    });
    const imgData = canvas.toDataURL("image/png");
    const ratio = canvas.width / canvas.height;
    let w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    pdf.addImage(imgData, "PNG", x, y, w, h);
    return h;
}

/* Page footer helper */
function footer(pdf: jsPDF, W: number, H: number, page: number) {
    pdf.setFillColor(...BRAND_CYAN);
    pdf.rect(0, H - 1.5, W, 1.5, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_LIGHT);
    pdf.text("Confidential  •  FORESIGHT Sales Loss Radar", 14, H - 4);
    pdf.text(`Page ${page}`, W - 22, H - 4);
}

export async function exportReportPDF(
    data: ReportData,
    chartsContainerId?: string
) {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, H = 297, M = 14;

    /* ══════════════════════════════════════════════════════════════
       PAGE 1 — COVER
    ══════════════════════════════════════════════════════════════ */
    pdf.setFillColor(...PAGE_BG);
    pdf.rect(0, 0, W, H, "F");

    // Top accent bar
    pdf.setFillColor(...BRAND_CYAN);
    pdf.rect(0, 0, W, 4, "F");

    // Left cyan sidebar strip
    pdf.setFillColor(...BRAND_CYAN);
    pdf.rect(0, 0, 1.5, H, "F");

    // Brand name
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...BRAND_CYAN);
    pdf.text("FORESIGHT", M, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MID);
    pdf.text("Sales Loss Radar", M, 24);

    // Title block
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(34);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text("Sales Loss", M, 74);
    pdf.text("Report", M, 88);

    // Underline
    pdf.setFillColor(...BRAND_CYAN);
    pdf.rect(M, 92, 42, 1.5, "F");

    // Sub-info
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(...TEXT_MID);
    pdf.text(`${data.brandName}  \u2022  ${data.productName}`, M, 103);
    pdf.setFontSize(9);
    pdf.text(`Generated: ${data.date}`, M, 111);

    // Risk badge (filled rect)
    const rc = riskColor(data.riskLevel);
    pdf.setFillColor(rc[0], rc[1], rc[2]);
    pdf.roundedRect(M, 122, 54, 20, 3, 3, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text("RISK LEVEL", M + 4, 131);
    pdf.setFontSize(16);
    pdf.text(data.riskLevel.toUpperCase(), M + 4, 139);

    // Big KPI row
    const kpis: Array<{ label: string; value: string; color: [number, number, number] }> = [
        { label: "PREDICTED DROP", value: `${data.predictedDropPct.toFixed(1)}%`, color: rc },
        { label: "LOSS PROBABILITY", value: `${(data.lossProbability * 100).toFixed(0)}%`, color: BRAND_CYAN },
        { label: "NEGATIVE COMMENTS", value: `${data.negativePct.toFixed(1)}%`, color: [220, 38, 38] },
    ];
    let kx = M;
    for (const k of kpis) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(28);
        pdf.setTextColor(...k.color);
        pdf.text(k.value, kx, 185);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(...TEXT_LIGHT);
        pdf.text(k.label, kx, 193);
        kx += 62;
    }

    // Explanation box
    pdf.setFillColor(...CARD_BG);
    pdf.roundedRect(M, 202, W - M * 2, 26, 2, 2, "F");
    pdf.setFillColor(...BRAND_CYAN);
    pdf.roundedRect(M, 202, 2, 26, 1, 1, "F");
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_MID);
    const expLines = pdf.splitTextToSize(`"${data.explanation}"`, W - M * 2 - 10);
    pdf.text(expLines, M + 6, 212);

    footer(pdf, W, H, 1);

    /* ══════════════════════════════════════════════════════════════
       PAGE 2 — KPI DETAILS + ACTIONS
    ══════════════════════════════════════════════════════════════ */
    pdf.addPage();
    pdf.setFillColor(...PAGE_BG);
    pdf.rect(0, 0, W, H, "F");
    pdf.setFillColor(...BRAND_CYAN);
    pdf.rect(0, 0, W, 4, "F");
    pdf.setFillColor(...BRAND_CYAN);
    pdf.rect(0, 0, 1.5, H, "F");

    // Section: Key Metrics
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text("Key Metrics", M, 20);
    pdf.setFillColor(...BRAND_CYAN);
    pdf.rect(M, 23, 28, 1.2, "F");

    const cards: Array<{ label: string; value: string; pct: number; color: [number, number, number] }> = [
        { label: "Predicted Sales Drop", value: `${data.predictedDropPct.toFixed(1)}%`, pct: data.predictedDropPct, color: riskColor(data.riskLevel) },
        { label: "Loss Probability", value: `${(data.lossProbability * 100).toFixed(0)}%`, pct: data.lossProbability * 100, color: BRAND_CYAN },
        { label: "Negative Comments", value: `${data.negativePct.toFixed(1)}%`, pct: data.negativePct, color: [220, 38, 38] },
        { label: "Average Sentiment", value: data.avgSentiment.toFixed(3), pct: ((data.avgSentiment + 1) / 2) * 100, color: BRAND_CYAN },
        { label: "Total Comments", value: String(data.totalPosts), pct: Math.min(100, (data.totalPosts / 200) * 100), color: [99, 102, 241] },
        { label: "Health Score", value: `${(100 - data.predictedDropPct).toFixed(0)}/100`, pct: 100 - data.predictedDropPct, color: [22, 163, 74] },
    ];

    let cy = 30;
    for (const c of cards) {
        pdf.setFillColor(...CARD_BG);
        pdf.roundedRect(M, cy, W - M * 2, 16, 2, 2, "F");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...TEXT_MID);
        pdf.text(c.label, M + 4, cy + 6.5);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(...c.color);
        pdf.text(c.value, M + 4, cy + 13);
        bar(pdf, M + 68, cy + 9.5, W - M * 2 - 74, 3, c.pct, c.color);
        cy += 19;
    }

    // Section: Priority Actions
    cy += 4;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text("Priority Actions", M, cy);
    pdf.setFillColor(...BRAND_CYAN);
    pdf.rect(M, cy + 2.5, 32, 1.2, "F");
    cy += 10;

    const dotColors: [number, number, number][] = [
        [220, 38, 38],   // red
        [234, 88, 12],   // orange
        [202, 138, 4],   // yellow
        [37, 99, 235],    // blue
    ];
    const actionLabels = ["Immediate (This Week)", "Short-Term (2-4 Weeks)", "Medium-Term (1-3 Months)", "Ongoing"];
    const actionDescs = [
        "Respond to top negative YouTube comments. Address most common customer complaints directly.",
        "Ship fast product fixes based on feedback themes. Update product descriptions and FAQs.",
        "Launch customer satisfaction campaign. Monitor sentiment with A/B testing.",
        "Monitor sentiment weekly and re-run FORESIGHT analysis after implementing changes.",
    ];

    for (let i = 0; i < 4; i++) {
        pdf.setFillColor(...CARD_BG);
        pdf.roundedRect(M, cy, W - M * 2, 18, 2, 2, "F");
        // Colored dot instead of emoji
        dot(pdf, M + 7, cy + 9, 3, dotColors[i]);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(...TEXT_DARK);
        pdf.text(actionLabels[i], M + 14, cy + 7);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...TEXT_MID);
        const lines = pdf.splitTextToSize(actionDescs[i], W - M * 2 - 18);
        pdf.text(lines, M + 14, cy + 13);
        cy += 21;
    }

    // Optional: chart screenshot
    if (chartsContainerId) {
        const el = document.getElementById(chartsContainerId);
        if (el) {
            cy += 4;
            if (cy + 60 > H - 15) {
                pdf.addPage();
                pdf.setFillColor(...PAGE_BG); pdf.rect(0, 0, W, H, "F");
                pdf.setFillColor(...BRAND_CYAN); pdf.rect(0, 0, W, 4, "F");
                cy = 20;
            }
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.setTextColor(...TEXT_DARK);
            pdf.text("Revenue Impact Chart", M, cy);
            cy += 5;
            await embedElement(pdf, el, M, cy, W - M * 2, 65);
        }
    }

    footer(pdf, W, H, 2);

    // Download
    const filename = `FORESIGHT_${data.brandName}_${data.productName}_${data.date}.pdf`
        .replace(/\s+/g, "_");
    pdf.save(filename);
}
