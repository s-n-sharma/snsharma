const toggleButton = document.getElementById('theme-toggle');
const body = document.body;

const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    body.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') toggleButton.textContent = '☀️';
}

toggleButton.addEventListener('click', () => {
    if (body.getAttribute('data-theme') === 'dark') {
        body.setAttribute('data-theme', 'light');
        toggleButton.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        toggleButton.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
});

function filterPosts(category) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase() === category) {
            btn.classList.add('active');
        }
    });
    if(category === 'all') buttons[0].classList.add('active');

    const posts = document.querySelectorAll('.post-item');
    posts.forEach(post => {
        const postTags = post.getAttribute('data-tag');
        if (category === 'all' || postTags.includes(category)) {
            post.style.display = 'block'; 
            post.classList.add('visible'); 
        } else {
            post.style.display = 'none'; 
            post.classList.remove('visible'); 
        }
    });

    const yearGroups = document.querySelectorAll('.year-group');
    
    yearGroups.forEach(group => {
        const visiblePosts = group.querySelectorAll('.post-item.visible');
        
        if (visiblePosts.length > 0) {
            group.style.display = 'block'; 
        } else {
            group.style.display = 'none';  
        }
    });
}
