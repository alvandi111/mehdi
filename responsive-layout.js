/* One data model and one set of routes for phone and desktop. */
(function(){
 const base=layout;
 layout=function(body,title,sub){const html=base(body,title,sub);const nav=[['dashboard','داشبورد','⌂'],['projects','پروژه‌ها','▦'],['finance','گزارش مالی','◉'],['people','افراد و پیمانکاران','♙'],['daily','گزارش روزانه','☷'],['documents','اسناد و رسیدها','▤'],['contracts','قراردادها','✎'],['settings','تنظیمات و پشتیبان','⚙']];
 return html.replace('<div class="phone-shell">','<div class="phone-shell"><aside class="desktop-sidebar" aria-label="منوی دسکتاپ"><a class="desktop-brand" href="./">پیمان‌یار<small>دفتر مدیریت پروژه</small></a><button class="btn gold desktop-create" onclick="openQuick()">＋ ثبت سریع</button><nav>'+nav.map(([key,name,icon])=>'<button class="'+(page===key?'active':'')+'" onclick="go(\''+key+'\')" '+(page===key?'aria-current="page"':'')+'><span>'+icon+'</span>'+name+'</button>').join('')+'</nav><small class="desktop-foot">گوشی و دسکتاپ، یک حساب</small></aside>');
 };render();
})();
