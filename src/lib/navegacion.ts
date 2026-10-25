export function hrefActivo(pathname: string, hrefs: string[]): string | undefined {
  return hrefs.filter((href) => pathname === href || pathname.startsWith(`${href}/`)).sort((a, b) => b.length - a.length)[0];
}
