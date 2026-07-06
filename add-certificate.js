const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Add Google Fonts for Signature and NASA font
if (!html.includes('fonts.googleapis.com')) {
    html = html.replace('</head>', `
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Cinzel:wght@600;800&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
    <style>
        /* Certificate Hidden Container */
        #certificate-container {
            position: absolute;
            top: -9999px;
            left: -9999px;
            z-index: -100;
        }

        /* NASA Style Certificate Design */
        .nasa-certificate {
            width: 1123px; /* A4 Landscape width at 96 DPI */
            height: 794px; /* A4 Landscape height at 96 DPI */
            background-color: #ffffff;
            background-image: radial-gradient(circle, rgba(0, 50, 150, 0.03) 10%, transparent 10%), radial-gradient(circle, rgba(0, 50, 150, 0.03) 10%, transparent 10%);
            background-size: 20px 20px;
            background-position: 0 0, 10px 10px;
            padding: 40px;
            box-sizing: border-box;
            font-family: 'Space Grotesk', sans-serif;
            position: relative;
        }
        
        .nasa-cert-border {
            border: 4px solid #002244;
            height: 100%;
            position: relative;
            padding: 40px 60px;
            box-sizing: border-box;
        }
        
        .nasa-cert-border::before {
            content: '';
            position: absolute;
            top: 4px; left: 4px; right: 4px; bottom: 4px;
            border: 1px solid #d4af37; /* Gold accent */
        }

        .cert-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            border-bottom: 2px solid #002244;
            padding-bottom: 20px;
        }

        .cert-logo img {
            height: 80px;
            filter: grayscale(100%) contrast(1.2);
        }

        .cert-agency {
            text-align: right;
            color: #002244;
        }
        .cert-agency h4 {
            margin: 0;
            font-size: 14px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
        .cert-agency h3 {
            margin: 5px 0 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 1px;
        }

        .cert-body {
            text-align: center;
            margin-top: 40px;
        }

        .cert-title {
            font-family: 'Cinzel', serif;
            font-size: 42px;
            color: #002244;
            letter-spacing: 5px;
            margin: 0 0 40px 0;
            font-weight: 800;
        }

        .cert-text {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .cert-name {
            font-family: 'Caveat', cursive;
            font-size: 64px;
            color: #002244;
            margin: 0 0 20px 0;
            border-bottom: 1px solid #ccc;
            display: inline-block;
            padding: 0 40px;
            line-height: 1;
        }

        .cert-course {
            font-family: 'Cinzel', serif;
            font-size: 28px;
            color: #d4af37;
            font-weight: 600;
            margin: 20px 0 50px 0;
        }

        .cert-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 60px;
        }

        .cert-signature {
            text-align: center;
            width: 250px;
        }
        
        .cert-signature-img {
            font-family: 'Caveat', cursive;
            font-size: 42px;
            color: #002244;
            margin-bottom: -10px;
        }

        .cert-signature-line {
            border-top: 1px solid #002244;
            margin-top: 10px;
            padding-top: 5px;
            font-size: 12px;
            color: #002244;
            letter-spacing: 1px;
            text-transform: uppercase;
            font-weight: 700;
        }
        
        .cert-date {
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
            font-weight: bold;
            color: #555;
            text-align: center;
        }
        
        .cert-seal {
            width: 120px;
            height: 120px;
            border: 3px double #d4af37;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 10px;
            font-family: 'Cinzel', serif;
            color: #d4af37;
            font-weight: bold;
            letter-spacing: 1px;
            transform: rotate(-15deg);
        }
    </style>
</head>`);
}

// 2. Add html2canvas and jsPDF to the bottom
if (!html.includes('html2canvas')) {
    html = html.replace('</body>', `
    <!-- Certificate Generation Libraries -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    
    <!-- Hidden Certificate Template -->
    <div id="certificate-container">
        <div class="nasa-certificate" id="certTemplate">
            <div class="nasa-cert-border">
                <div class="cert-header">
                    <div class="cert-logo">
                        <img src="assets/user-photo.jpg" alt="Tech Indro Logo">
                    </div>
                    <div class="cert-agency">
                        <h4>Tech Indro</h4>
                        <h3>Space & Research Wing</h3>
                    </div>
                </div>
                
                <div class="cert-body">
                    <h1 class="cert-title">Certificate of Achievement</h1>
                    <div class="cert-text">This is to officially certify that</div>
                    <div class="cert-name" id="certUserName">John Doe</div>
                    <div class="cert-text" style="margin-top: 10px;">has successfully completed the mission training requirements for</div>
                    <div class="cert-course" id="certCourseName">Advanced Artificial Intelligence</div>
                </div>
                
                <div class="cert-footer">
                    <div class="cert-signature">
                        <div class="cert-signature-img">AI Mentor</div>
                        <div class="cert-signature-line">Mission Commander</div>
                    </div>
                    
                    <div class="cert-seal">
                        OFFICIAL<br>TECH INDRO<br>SEAL OF<br>EXCELLENCE
                    </div>
                    
                    <div class="cert-signature">
                        <div class="cert-date" id="certDate">05 JULY 2026</div>
                        <div class="cert-signature-line">Date of Issuance</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>`);
}

// 3. Update dashboard grid JavaScript
const oldGridScript = `                                <a href="course-details.html?id=\${course.id}" class="btn-primary" style="width: 100%; text-align: center; margin-top: 1.5rem; padding: 0.75rem;">Resume Learning</a>
                            </div>
                        \`;`;
                        
const newGridScript = `                                <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                                    <a href="course-details.html?id=\${course.id}" class="btn-primary" style="flex: 1; text-align: center; padding: 0.75rem;">Resume</a>
                                    <button onclick="downloadCertificate('\${course.title.replace(/'/g, "\\'")}')" class="btn-secondary" style="flex: 1; padding: 0.75rem; background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); color: #10b981;" title="Download NASA-Style Certificate">
                                        <i data-lucide="award"></i> Certificate
                                    </button>
                                </div>
                            </div>
                        \`;`;
                        
if (html.includes(oldGridScript)) {
    html = html.replace(oldGridScript, newGridScript);
}

// 4. Add the certificate generation JS function
if (!html.includes('function downloadCertificate')) {
    const certLogic = `
        async function downloadCertificate(courseTitle) {
            // Get User Name
            let userName = "Tech Indro Student";
            try {
                const userObj = JSON.parse(localStorage.getItem('techIndroUser'));
                if (userObj && userObj.name) userName = userObj.name;
            } catch(e) {}
            
            // Set dynamic data in template
            document.getElementById('certUserName').innerText = userName;
            document.getElementById('certCourseName').innerText = courseTitle;
            
            const today = new Date();
            const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
            document.getElementById('certDate').innerText = dateStr;
            
            // Show toast
            const btnEvent = window.event;
            const btn = btnEvent ? btnEvent.currentTarget : null;
            let originalHtml = '';
            if (btn) {
                originalHtml = btn.innerHTML;
                btn.innerHTML = '<i data-lucide="loader" class="spin-icon"></i> Generating...';
                lucide.createIcons();
            }

            try {
                // Wait a moment for fonts to load if necessary
                await new Promise(r => setTimeout(r, 500));
                
                const certElement = document.getElementById('certTemplate');
                
                // html2canvas capture
                const canvas = await html2canvas(certElement, {
                    scale: 2, // High resolution
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });
                
                const imgData = canvas.toDataURL('image/png');
                
                // jsPDF generate A4 Landscape PDF
                const { jsPDF } = window.jspdf;
                // A4 landscape dimensions in mm: 297 x 210
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                });
                
                pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
                pdf.save(\`Tech_Indro_Certificate_\${userName.replace(/ /g, '_')}.pdf\`);
                
                if (btn) {
                    btn.innerHTML = '<i data-lucide="check"></i> Downloaded';
                    lucide.createIcons();
                    setTimeout(() => { btn.innerHTML = originalHtml; lucide.createIcons(); }, 3000);
                }
            } catch(e) {
                console.error("Certificate Error:", e);
                alert("Failed to generate certificate. Please try again.");
                if(btn) { btn.innerHTML = originalHtml; lucide.createIcons(); }
            }
        }
    </script>`;
    
    html = html.replace('</script>\n<script src="main.js"></script>', certLogic + '\n<script src="main.js"></script>');
}

fs.writeFileSync('dashboard.html', html);
console.log("Successfully added NASA-style certificate generator to dashboard");
