// Dates on receipts are event dates, never the device's upload date.
(function(root){
  const digits=value=>String(value??'').replace(/[۰-۹٠-٩]/g,c=>{
    const code=c.charCodeAt(0);return String(code>=0x6f0?code-0x6f0:code-0x660)
  });
  function date(value){
    const input=digits(value).replace(/[ـ\u200c]/g,' ');
    const matches=[...input.matchAll(/(?<!\d)(1[34]\d{2}|20\d{2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?!\d)|(?<!\d)(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(1[34]\d{2}|20\d{2})(?!\d)/g)];
    for(const match of matches){
      const year=Number(match[1]?.length===4?match[1]:match[6]);
      const month=Number(match[1]?.length===4?match[2]:match[5]);
      const day=Number(match[1]?.length===4?match[3]:match[4]);
      if(!month||month>12||!day||day>31)continue;
      if(year<1700){
        if(day>(month<=6?31:month<=11?30:30))continue;
        return `${year}/${String(month).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
      }
      const utc=new Date(Date.UTC(year,month-1,day));
      if(utc.getUTCFullYear()!==year||utc.getUTCMonth()!==month-1||utc.getUTCDate()!==day)continue;
      const parts=new Intl.DateTimeFormat('en-US-u-ca-persian',{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(utc);
      const get=type=>parts.find(part=>part.type===type)?.value;
      return `${get('year')}/${get('month')}/${get('day')}`;
    }
    return '';
  }
  function extract(text){
    const lines=String(text??'').split(/\r?\n/);
    const labelled=lines.filter(line=>/(?:تاریخ|date|زمان تراکنش|تراکنش)/i.test(line));
    for(const line of [...labelled,...lines]){const found=date(line);if(found)return found}
    return '';
  }
  root.PeymanyarReceiptDate={date,extract};
})(typeof window==='undefined'?globalThis:window);
