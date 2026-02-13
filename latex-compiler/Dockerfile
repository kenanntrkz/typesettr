FROM texlive/texlive:latest

RUN apt-get update && \
    apt-get install -y curl poppler-utils && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN tlmgr update --self 2>/dev/null; \
    tlmgr install \
    babel-turkish hyphen-turkish \
    ebgaramond libertine palatino mathptmx \
    booktabs longtable multirow float array \
    fancyhdr titlesec tocloft \
    hyperref bookmark \
    biblatex biber \
    makeidx \
    geometry setspace \
    graphicx xcolor \
    tikz tcolorbox pgf \
    microtype parskip \
    enumitem caption subcaption \
    csquotes pdfpages pdflscape lastpage \
    inputenc fontenc opensans 2>/dev/null || true

WORKDIR /app
COPY package.json ./
RUN npm install --only=production
COPY server.js compiler.js ./
COPY templates/ ./templates/

RUN mkdir -p /tmp/latex-jobs && \
    useradd -m -s /bin/bash compiler && \
    chown -R compiler:compiler /app /tmp/latex-jobs

RUN mkdir -p /tmp/latex-jobs && chmod 777 /tmp/latex-jobs
USER compiler
EXPOSE 3001
CMD ["node", "server.js"]
