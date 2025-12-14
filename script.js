const toggleButton = document.getElementById('theme-toggle');
const body = document.body;

const sunIcon = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
</svg>
`;

const moonIcon = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
</svg>
`;



const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    body.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        toggleButton.innerHTML = sunIcon;
    } else {
        toggleButton.innerHTML = moonIcon;
    }
} else {
    toggleButton.innerHTML = moonIcon;
}


toggleButton.addEventListener('click', () => {
    if (body.getAttribute('data-theme') === 'dark') {
        body.setAttribute('data-theme', 'light');
        toggleButton.innerHTML = moonIcon; 
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        toggleButton.innerHTML = sunIcon; 
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

window.addEventListener('load', () => {
    setTimeout(() => {
        document.body.classList.add('preload-transitions');
    }, 100); 
});
