document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const articleBody = document.getElementById('articleBody');
    const pdfContainer = document.getElementById('pdfContainer');
    const pdfFrame = document.getElementById('pdfFrame');
    const viewPdfBtn = document.getElementById('viewPdfBtn');

    // All list items
    const listItems = document.querySelectorAll('.chapter-list li');

    // Sidebar Toggle Logic
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('closed');
    });

    // Configure marked (Markdown parser)
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    // Function to load content (Markdown or Raw text)
    async function loadContent(src, type, element) {
        try {
            // Show loading state
            articleBody.innerHTML = '<div class="loading-state">加载中... (Loading)</div>';
            articleBody.style.display = 'block';
            pdfContainer.style.display = 'none';
            viewPdfBtn.classList.remove('active');

            // Update active state in sidebar
            listItems.forEach(li => li.classList.remove('active'));
            if (element) element.classList.add('active');

            // Fetch file
            const response = await fetch(src);
            if (!response.ok) throw new Error('File not found');
            const text = await response.text();

            // Render
            if (type === 'md') {
                articleBody.className = 'markdown-body';

                // Protect math blocks from marked.js mangling (like converting _ to <em>)
                let mathBlocks = [];
                let processedText = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
                    mathBlocks.push(math);
                    return `@@MATH_BLOCK_${mathBlocks.length - 1}@@`;
                });
                processedText = processedText.replace(/\$([^\n\$]+?)\$/g, (match, math) => {
                    mathBlocks.push(math);
                    return `@@MATH_INLINE_${mathBlocks.length - 1}@@`;
                });

                // Parse markdown
                let html = marked.parse(processedText);

                // Restore math blocks
                html = html.replace(/@@MATH_BLOCK_(\d+)@@/g, (match, i) => {
                    return `$$${mathBlocks[i]}$$`;
                });
                html = html.replace(/@@MATH_INLINE_(\d+)@@/g, (match, i) => {
                    return `$${mathBlocks[i]}$`;
                });

                articleBody.innerHTML = html;

                // Render math equations
                if (typeof renderMathInElement !== 'undefined') {
                    renderMathInElement(articleBody, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false }
                        ],
                        throwOnError: false
                    });
                }
            } else if (type === 'raw') {
                articleBody.className = 'markdown-body raw-text';
                articleBody.innerHTML = text;
            }

            // Scroll to top
            document.getElementById('mainContent').scrollTop = 0;

            // Save to localStorage
            localStorage.setItem('lastViewed', JSON.stringify({ src, type }));

        } catch (error) {
            console.error('Error loading content:', error);
            articleBody.innerHTML = `<div class="loading-state" style="color: #ef4444;">无法加载内容 (Failed to load content): ${src}</div>`;
        }
    }

    // List item click handlers
    listItems.forEach(li => {
        li.addEventListener('click', function () {
            const src = this.getAttribute('data-src');
            const type = this.getAttribute('data-type');
            loadContent(src, type, this);

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.add('closed');
            }
        });
    });

    // PDF View Handler
    viewPdfBtn.addEventListener('click', function () {
        // Hide markdown, show PDF
        articleBody.style.display = 'none';
        pdfContainer.style.display = 'block';

        // Load PDF if not loaded
        if (!pdfFrame.getAttribute('src')) {
            pdfFrame.setAttribute('src', 'source/book.pdf');
        }

        // Update active states
        listItems.forEach(li => li.classList.remove('active'));
        this.classList.add('active');

        // Save state
        localStorage.setItem('lastViewed', JSON.stringify({ src: 'pdf', type: 'pdf' }));

        if (window.innerWidth <= 768) {
            sidebar.classList.add('closed');
        }
    });

    // Initial load logic
    const lastViewed = JSON.parse(localStorage.getItem('lastViewed'));

    if (lastViewed && lastViewed.type === 'pdf') {
        viewPdfBtn.click();
    } else if (lastViewed && lastViewed.src) {
        // Find the element that matches the saved src to mark it active
        const targetElement = Array.from(listItems).find(li => li.getAttribute('data-src') === lastViewed.src);
        loadContent(lastViewed.src, lastViewed.type, targetElement);
    } else {
        // Load first translated chapter by default
        const firstItem = document.querySelector('#translated-list li');
        if (firstItem) firstItem.click();
    }
});
