package com.scrapgullak.support;

import java.io.Serializable;
import java.util.Comparator;

/**
 * Natural, case-insensitive ordering for Noida sector names so an agent's route reads
 * "Sector 18" &lt; "Sector 62" &lt; "Sector 137" (digit runs compare numerically). Nulls sort last.
 */
public final class SectorComparator implements Comparator<String>, Serializable {

    public static final SectorComparator INSTANCE = new SectorComparator();

    private SectorComparator() {
    }

    @Override
    public int compare(String a, String b) {
        if (a == null || b == null) {
            return a == null ? (b == null ? 0 : 1) : -1;
        }
        int i = 0;
        int j = 0;
        while (i < a.length() && j < b.length()) {
            char ca = a.charAt(i);
            char cb = b.charAt(j);
            if (Character.isDigit(ca) && Character.isDigit(cb)) {
                int endA = digitRunEnd(a, i);
                int endB = digitRunEnd(b, j);
                int cmp = compareNumeric(a.substring(i, endA), b.substring(j, endB));
                if (cmp != 0) {
                    return cmp;
                }
                i = endA;
                j = endB;
            } else {
                int cmp = Character.compare(Character.toLowerCase(ca), Character.toLowerCase(cb));
                if (cmp != 0) {
                    return cmp;
                }
                i++;
                j++;
            }
        }
        int remaining = Integer.compare(a.length() - i, b.length() - j);
        // Fully equal ignoring case/leading zeros: fall back to a strict order for a stable, consistent sort.
        return remaining != 0 ? remaining : a.compareTo(b);
    }

    private static int digitRunEnd(String s, int start) {
        int end = start;
        while (end < s.length() && Character.isDigit(s.charAt(end))) {
            end++;
        }
        return end;
    }

    /** Compares two digit strings of any length numerically (no overflow). */
    private static int compareNumeric(String x, String y) {
        String nx = stripLeadingZeros(x);
        String ny = stripLeadingZeros(y);
        if (nx.length() != ny.length()) {
            return Integer.compare(nx.length(), ny.length());
        }
        return nx.compareTo(ny);
    }

    private static String stripLeadingZeros(String s) {
        int k = 0;
        while (k < s.length() - 1 && s.charAt(k) == '0') {
            k++;
        }
        return s.substring(k);
    }

    private Object readResolve() {
        return INSTANCE;
    }
}